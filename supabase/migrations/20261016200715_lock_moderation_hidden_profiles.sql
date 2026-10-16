-- A moderator "hide" (review_profile_report) forced is_public = false and
-- cleared header_image_path, but the "update own profile" RLS policy lets the
-- owner write any column, so both could be undone straight away. Hide now
-- also stamps moderation_hidden_at, and a trigger enforces three rules
-- against client roles (authenticated/anon):
--   * is_public can't be true while moderation_hidden_at is set. The
--     "profile_hidden" message and SQLSTATE WH001 are what the profile tab
--     matches on (PROFILE_HIDDEN_ERROR_CODE in src/lib/queries.ts).
--   * moderation_hidden_at itself is never client-writable.
--   * header_image_path may only be cleared (the remove-photo flow). Setting
--     it is reserved for the upload-header-photo edge function (service role),
--     which NSFW-scans first.
-- service_role and SECURITY DEFINER RPCs (run as their owner) pass untouched.
-- Un-hiding is a deliberate moderator act from the dashboard SQL editor:
--   UPDATE user_profiles SET moderation_hidden_at = NULL WHERE user_id = '<id>';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS moderation_hidden_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION guard_user_profile_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.moderation_hidden_at IS NOT NULL THEN
      RAISE EXCEPTION 'moderation_hidden_at is not client-writable' USING ERRCODE = '42501';
    END IF;
    IF NEW.header_image_path IS NOT NULL THEN
      RAISE EXCEPTION 'header_image_path can only be set by the upload function' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.moderation_hidden_at IS DISTINCT FROM OLD.moderation_hidden_at THEN
    RAISE EXCEPTION 'moderation_hidden_at is not client-writable' USING ERRCODE = '42501';
  END IF;
  IF NEW.header_image_path IS NOT NULL
     AND NEW.header_image_path IS DISTINCT FROM OLD.header_image_path THEN
    RAISE EXCEPTION 'header_image_path can only be set by the upload function' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_public AND NEW.moderation_hidden_at IS NOT NULL THEN
    RAISE EXCEPTION 'profile_hidden' USING ERRCODE = 'WH001',
      DETAIL = 'This profile was hidden by a moderator and cannot be made public.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_guard_writes ON user_profiles;
CREATE TRIGGER user_profiles_guard_writes
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION guard_user_profile_writes();

-- Deleting the row and re-inserting it would wipe moderation_hidden_at. The
-- client never deletes its profile row; account deletion cascades from
-- auth.users.
DROP POLICY IF EXISTS "delete own profile" ON user_profiles;

-- Same as 20261016020000's version, plus the moderation_hidden_at stamp.
CREATE OR REPLACE FUNCTION review_profile_report(
  p_report_id uuid, p_action text, p_note text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_header text;
BEGIN
  IF NOT (
    (auth.uid() IS NULL AND session_user = 'postgres')
    OR EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;
  IF p_action NOT IN ('hide', 'dismiss') THEN
    RAISE EXCEPTION 'unknown action % (use hide / dismiss)', p_action;
  END IF;

  SELECT * INTO r FROM profile_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found';
  END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'report already reviewed (%)', r.status;
  END IF;

  IF p_action = 'hide' THEN
    SELECT header_image_path INTO v_header
    FROM user_profiles WHERE user_id = r.reported_user_id FOR UPDATE;
    UPDATE user_profiles
    SET is_public = false, header_image_path = NULL,
        moderation_hidden_at = now(), updated_at = now()
    WHERE user_id = r.reported_user_id;
    UPDATE profile_reports
    SET status = 'hidden', moderator_note = p_note, reviewed_at = now()
    WHERE reported_user_id = r.reported_user_id AND status = 'pending';
  ELSE
    UPDATE profile_reports
    SET status = 'dismissed', moderator_note = p_note, reviewed_at = now()
    WHERE id = p_report_id;
  END IF;

  RETURN v_header;
END;
$$;

REVOKE EXECUTE ON FUNCTION guard_user_profile_writes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION review_profile_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_profile_report(uuid, text, text) TO authenticated;
