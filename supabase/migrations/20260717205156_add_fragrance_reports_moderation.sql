-- Catalog feedback: users flag a wrong image, a duplicate entry, or an
-- incorrect name/brand on an existing catalog row. Separate from
-- fragrance_submissions (which proposes NEW catalog rows) — this is about
-- fixing EXISTING ones. Mirrors that table's shape: own-rows SELECT only,
-- writes go through SECURITY DEFINER RPCs so the rate cap can't be bypassed,
-- and moderator review is a second RPC gated the same way review_submission
-- is. The actual data fix (editing fragrances.name/brand/image_url) stays a
-- manual moderator SQL step, same as it already is for the catalog itself.
CREATE TABLE IF NOT EXISTS fragrance_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fragrance_id  UUID NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL CONSTRAINT fragrance_reports_reason_valid
                  CHECK (reason IN ('wrong_image', 'duplicate', 'incorrect_name_or_brand', 'other')),
  details       TEXT CONSTRAINT fragrance_reports_details_length CHECK (char_length(details) <= 1000),
  status        TEXT NOT NULL DEFAULT 'pending' CONSTRAINT fragrance_reports_status_valid
                  CHECK (status IN ('pending', 'resolved', 'dismissed')),
  moderator_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS fragrance_reports_fragrance_id_idx ON fragrance_reports (fragrance_id);
CREATE INDEX IF NOT EXISTS fragrance_reports_user_id_idx ON fragrance_reports (user_id);
CREATE INDEX IF NOT EXISTS fragrance_reports_pending_idx
  ON fragrance_reports (created_at) WHERE status = 'pending';
-- One pending report per user/fragrance/reason — resubmitting the same
-- complaint just bumps nothing (see ON CONFLICT below) instead of piling up.
CREATE UNIQUE INDEX IF NOT EXISTS fragrance_reports_pending_unique
  ON fragrance_reports (user_id, fragrance_id, reason) WHERE status = 'pending';

ALTER TABLE fragrance_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports (e.g. a future "reported" badge). No
-- INSERT/UPDATE/DELETE policies: writes go through the RPCs below so the
-- rate cap and reason validation can't be bypassed.
CREATE POLICY "own reports" ON fragrance_reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- File a report against an existing catalog row. SECURITY DEFINER because
-- clients have no INSERT policy. Rate-capped at 20 pending/user (higher than
-- submissions' 5 — reports are lower-stakes, one-tap complaints) and
-- serialized via advisory lock so concurrent calls can't race the cap.
CREATE OR REPLACE FUNCTION submit_fragrance_report(
  p_fragrance_id uuid, p_reason text, p_details text DEFAULT NULL
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
  IF p_reason NOT IN ('wrong_image', 'duplicate', 'incorrect_name_or_brand', 'other') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM fragrances WHERE id = p_fragrance_id) THEN
    RAISE EXCEPTION 'fragrance not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('fragrance_reports'), hashtext(v_uid::text));
  IF (SELECT count(*) FROM fragrance_reports
      WHERE user_id = v_uid AND status = 'pending') >= 20 THEN
    RAISE EXCEPTION 'too many pending reports';
  END IF;

  -- Idempotent: re-tapping "report" for the same reason on the same item
  -- returns the existing pending report instead of erroring or duplicating.
  INSERT INTO fragrance_reports (user_id, fragrance_id, reason, details)
  VALUES (v_uid, p_fragrance_id, p_reason, v_details)
  ON CONFLICT (user_id, fragrance_id, reason) WHERE status = 'pending'
  DO UPDATE SET details = coalesce(EXCLUDED.details, fragrance_reports.details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Moderator decision — 'resolve' (the moderator fixed the catalog row, or
-- confirmed it needed no fix) or 'dismiss' (not a real issue). Neither
-- action touches `fragrances` itself; correcting the row's data is a manual
-- SQL-editor step (UPDATE fragrances SET ... WHERE id = ...), same as the
-- rest of this catalog's moderation. Callable from the dashboard SQL editor
-- (trusted, no JWT) or the in-app moderation screen. Example:
--   SELECT review_fragrance_report('<report-id>', 'resolve', 'fixed the photo');
--   SELECT review_fragrance_report('<report-id>', 'dismiss', 'not a duplicate');
CREATE OR REPLACE FUNCTION review_fragrance_report(
  p_report_id uuid, p_action text, p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NOT (
    (auth.uid() IS NULL AND session_user = 'postgres')
    OR EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;
  IF p_action NOT IN ('resolve', 'dismiss') THEN
    RAISE EXCEPTION 'unknown action % (use resolve / dismiss)', p_action;
  END IF;

  SELECT * INTO r FROM fragrance_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found';
  END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'report already reviewed (%)', r.status;
  END IF;

  UPDATE fragrance_reports
  SET status = CASE p_action WHEN 'resolve' THEN 'resolved' ELSE 'dismissed' END,
      moderator_note = p_note,
      reviewed_at = now()
  WHERE id = p_report_id;

  RETURN r.fragrance_id;
END;
$$;

-- Moderation queue read (src/app/moderation.tsx's Reports tab). RLS only
-- lets a user see their own fragrance_reports rows, so a moderator needs a
-- SECURITY DEFINER path to list everyone's pending reports — mirrors
-- list_pending_submissions.
CREATE OR REPLACE FUNCTION list_fragrance_reports(p_max_results integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  fragrance_id uuid,
  reason text,
  details text,
  created_at timestamptz,
  brand text,
  name text,
  image_url text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;

  RETURN QUERY
  SELECT fr.id, fr.fragrance_id, fr.reason, fr.details, fr.created_at,
         f.brand, f.name, f.image_url
  FROM fragrance_reports fr
  JOIN fragrances f ON f.id = fr.fragrance_id
  WHERE fr.status = 'pending'
  ORDER BY fr.created_at
  LIMIT p_max_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_fragrance_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_fragrance_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION review_fragrance_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_fragrance_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION list_fragrance_reports(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_fragrance_reports(integer) TO authenticated;
