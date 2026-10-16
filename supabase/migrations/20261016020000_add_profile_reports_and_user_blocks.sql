-- App Review guideline 1.2 for the public-profile / Top Collectors UGC
-- surfaces: a way to report a profile and a way to block a user.
--
-- profile_reports mirrors fragrance_reports exactly: own-rows SELECT only,
-- writes go through SECURITY DEFINER RPCs so the rate cap and reason
-- validation can't be bypassed, and moderator review is gated the same way
-- review_fragrance_report is (moderators table, or the trusted no-JWT
-- dashboard SQL editor).
CREATE TABLE IF NOT EXISTS profile_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL CONSTRAINT profile_reports_reason_valid
                     CHECK (reason IN ('offensive_name', 'offensive_photo', 'harassment_or_spam', 'other')),
  details          TEXT CONSTRAINT profile_reports_details_length CHECK (char_length(details) <= 1000),
  status           TEXT NOT NULL DEFAULT 'pending' CONSTRAINT profile_reports_status_valid
                     CHECK (status IN ('pending', 'hidden', 'dismissed')),
  moderator_note   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  CONSTRAINT profile_reports_not_self CHECK (user_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS profile_reports_reported_user_id_idx ON profile_reports (reported_user_id);
CREATE INDEX IF NOT EXISTS profile_reports_user_id_idx ON profile_reports (user_id);
CREATE INDEX IF NOT EXISTS profile_reports_pending_idx
  ON profile_reports (created_at) WHERE status = 'pending';
-- One pending report per reporter/profile/reason — re-reporting is idempotent
CREATE UNIQUE INDEX IF NOT EXISTS profile_reports_pending_unique
  ON profile_reports (user_id, reported_user_id, reason) WHERE status = 'pending';

ALTER TABLE profile_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile reports" ON profile_reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- File a report against another user's profile. Same 20-pending cap and
-- advisory-lock serialization as submit_fragrance_report.
CREATE OR REPLACE FUNCTION submit_profile_report(
  p_reported_user uuid, p_reason text, p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_details text := NULLIF(btrim(coalesce(p_details, '')), '');
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF p_reason NOT IN ('offensive_name', 'offensive_photo', 'harassment_or_spam', 'other') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;
  IF p_reported_user = v_uid THEN
    RAISE EXCEPTION 'cannot report yourself';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_reported_user) THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('profile_reports'), hashtext(v_uid::text));
  IF (SELECT count(*) FROM profile_reports
      WHERE user_id = v_uid AND status = 'pending') >= 20 THEN
    RAISE EXCEPTION 'too many pending reports';
  END IF;

  INSERT INTO profile_reports (user_id, reported_user_id, reason, details)
  VALUES (v_uid, p_reported_user, p_reason, v_details)
  ON CONFLICT (user_id, reported_user_id, reason) WHERE status = 'pending'
  DO UPDATE SET details = coalesce(EXCLUDED.details, profile_reports.details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Moderator decision:
--   hide    -> force the profile private and clear header_image_path; every
--              other pending report against the same profile is settled too.
--              Returns the cleared header path so the moderator's client can
--              remove the storage object (direct DELETEs on storage.objects
--              are blocked by Supabase — objects go through the Storage API,
--              allowed for moderators by the policies at the end of this file).
--   dismiss -> stamp status/note only. Returns NULL.
--   SELECT review_profile_report('<report-id>', 'hide', 'offensive photo');
--   SELECT review_profile_report('<report-id>', 'dismiss');
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
    SET is_public = false, header_image_path = NULL, updated_at = now()
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

-- Moderation queue read (moderation.tsx's profile-reports tab) — mirrors
-- list_fragrance_reports. LEFT JOIN: a report stays reviewable even if the
-- profile row was deleted meanwhile.
CREATE OR REPLACE FUNCTION list_profile_reports(p_max_results integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  reported_user_id uuid,
  reason text,
  details text,
  created_at timestamptz,
  display_name text,
  avatar_url text,
  header_image_path text,
  is_public boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;

  RETURN QUERY
  SELECT pr.id, pr.reported_user_id, pr.reason, pr.details, pr.created_at,
         p.display_name, p.avatar_url, p.header_image_path, p.is_public
  FROM profile_reports pr
  LEFT JOIN user_profiles p ON p.user_id = pr.reported_user_id
  WHERE pr.status = 'pending'
  ORDER BY pr.created_at
  LIMIT p_max_results;
END;
$$;

-- User blocks: private to the blocker (the blocked user can't tell).
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_id_idx ON user_blocks (blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own blocks select" ON user_blocks FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);

CREATE POLICY "own blocks insert" ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = blocker_id);

CREATE POLICY "own blocks delete" ON user_blocks FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);

-- Blocked users read as private to the blocker everywhere user_profiles is
-- selected (Top Collectors list + the user-profile screen), server-side.
DROP POLICY IF EXISTS "public or own profile" ON user_profiles;
CREATE POLICY "public or own profile" ON user_profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (
      is_public
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE b.blocker_id = (SELECT auth.uid()) AND b.blocked_id = user_profiles.user_id
      )
    )
  );

-- Same block gate for the profile's top-worn aggregate.
CREATE OR REPLACE FUNCTION user_top_worn(target_user uuid, max_results int DEFAULT 5)
RETURNS TABLE (name text, image_url text, wear_count bigint)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT we.name, max(we.image_url) AS image_url, count(*) AS wear_count
  FROM wear_events we
  WHERE we.user_id = target_user
    AND (
      target_user = auth.uid()
      OR (
        EXISTS (
          SELECT 1 FROM user_profiles p
          WHERE p.user_id = target_user AND p.is_public
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE b.blocker_id = auth.uid() AND b.blocked_id = target_user
        )
      )
    )
  GROUP BY we.name
  ORDER BY count(*) DESC, max(we.worn_at) DESC
  LIMIT least(greatest(coalesce(max_results, 5), 1), 20)
$$;

-- Moderators may remove any header photo (the hide action above). Storage
-- API removes need SELECT as well as DELETE on the object.
CREATE POLICY "moderator profile header select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-headers' AND EXISTS (
    SELECT 1 FROM public.moderators m WHERE m.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "moderator profile header delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-headers' AND EXISTS (
    SELECT 1 FROM public.moderators m WHERE m.user_id = (SELECT auth.uid())
  ));

REVOKE EXECUTE ON FUNCTION submit_profile_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_profile_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION review_profile_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_profile_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION list_profile_reports(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_profile_reports(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION user_top_worn(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION user_top_worn(uuid, int) TO authenticated;
