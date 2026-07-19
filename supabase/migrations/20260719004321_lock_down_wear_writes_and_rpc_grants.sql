-- wear_events becomes client-read-only: the one-wear-per-day rule and the
-- name/image snapshot integrity only hold if increment_wear/undo_wear are the
-- sole write path. History/export screens keep their own-rows SELECT.
DROP POLICY IF EXISTS "own events" ON wear_events;
CREATE POLICY "own events" ON wear_events FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON TABLE wear_events FROM PUBLIC, anon, authenticated;

-- The write RPCs move to SECURITY DEFINER (clients no longer have direct
-- INSERT/DELETE) with explicit ownership checks replacing what RLS did.
CREATE OR REPLACE FUNCTION increment_wear(row_id uuid, tz text DEFAULT 'UTC')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  BEGIN
    PERFORM now() AT TIME ZONE tz;
  EXCEPTION WHEN OTHERS THEN
    tz := 'UTC';
  END;

  UPDATE user_fragrances u
  SET times_worn = u.times_worn + 1, last_worn = now()
  WHERE u.id = row_id
    AND u.user_id = v_uid
    AND (u.last_worn IS NULL
         OR (u.last_worn AT TIME ZONE tz)::date < (now() AT TIME ZONE tz)::date)
  RETURNING u.user_id, u.fragrance_id, u.name, u.image_url INTO r;

  IF NOT FOUND THEN
    RETURN false;  -- already worn today, not the caller's row, or no such row
  END IF;

  INSERT INTO wear_events (user_id, fragrance_id, user_fragrance_id, name, image_url)
  VALUES (r.user_id, r.fragrance_id, row_id, r.name, r.image_url);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION undo_wear(row_id uuid, tz text DEFAULT 'UTC')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  ev_id uuid;
  prev_worn timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  BEGIN
    PERFORM now() AT TIME ZONE tz;
  EXCEPTION WHEN OTHERS THEN
    tz := 'UTC';
  END;

  SELECT id INTO ev_id
  FROM wear_events
  WHERE user_fragrance_id = row_id
    AND user_id = v_uid
    AND (worn_at AT TIME ZONE tz)::date = (now() AT TIME ZONE tz)::date
  ORDER BY worn_at DESC
  LIMIT 1;

  IF ev_id IS NULL THEN
    RETURN false;  -- no wear today, or not the caller's row
  END IF;

  DELETE FROM wear_events WHERE id = ev_id;

  SELECT max(worn_at) INTO prev_worn
  FROM wear_events
  WHERE user_fragrance_id = row_id AND user_id = v_uid;

  UPDATE user_fragrances u
  SET times_worn = GREATEST(u.times_worn - 1, 0), last_worn = prev_worn
  WHERE u.id = row_id AND u.user_id = v_uid;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_wear(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_wear(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION undo_wear(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION undo_wear(uuid, text) TO authenticated;

-- Re-assert the grants schema.sql already declares but that drifted on the
-- live DB (CREATE OR REPLACE preserves old ACLs): no anon EXECUTE on the
-- submission/report/moderation RPCs or the manual-add path.
REVOKE EXECUTE ON FUNCTION submit_fragrance_suggestion(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_fragrance_suggestion(text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION add_manual_fragrance(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_manual_fragrance(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION list_pending_submissions(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION list_pending_submissions(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION submit_fragrance_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_fragrance_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION review_fragrance_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_fragrance_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION list_fragrance_reports(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION list_fragrance_reports(integer) TO authenticated;

-- Advisor: valid_tag_array had a role-mutable search_path (it backs a CHECK
-- constraint on user_fragrances).
ALTER FUNCTION valid_tag_array(text[]) SET search_path = public;
