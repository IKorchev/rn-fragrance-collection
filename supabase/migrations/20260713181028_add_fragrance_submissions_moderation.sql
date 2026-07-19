-- User-suggested catalog additions. A manual add stays instant and personal
-- (user_fragrances, fragrance_id NULL); this table only queues the suggestion
-- for promotion into the shared fragrances catalog. Nothing here is visible
-- in search until a moderator approves (approval is what inserts the catalog
-- row).

CREATE TABLE IF NOT EXISTS fragrance_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Submitter's collection row, for FK backfill on approval. SET NULL keeps
  -- the submission reviewable if they delete the row meanwhile.
  user_fragrance_id    UUID REFERENCES user_fragrances(id) ON DELETE SET NULL,
  brand                TEXT NOT NULL CONSTRAINT fragrance_submissions_brand_length
                         CHECK (char_length(btrim(brand)) BETWEEN 1 AND 100),
  title                TEXT NOT NULL CONSTRAINT fragrance_submissions_title_length
                         CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  status               TEXT NOT NULL DEFAULT 'pending' CONSTRAINT fragrance_submissions_status_valid
                         CHECK (status IN ('pending', 'approved', 'merged', 'rejected')),
  -- Outcome: the catalog row created (approve) or linked (merge)
  decided_fragrance_id UUID REFERENCES fragrances(id),
  -- Triage: closest catalog match at submit time (pg_trgm), so the review
  -- query can surface likely duplicates first
  similar_fragrance_id UUID REFERENCES fragrances(id),
  similarity           REAL,
  moderator_note       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS fragrance_submissions_user_id_idx ON fragrance_submissions (user_id);
CREATE INDEX IF NOT EXISTS fragrance_submissions_pending_idx
  ON fragrance_submissions (created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS fragrance_submissions_user_fragrance_id_idx
  ON fragrance_submissions (user_fragrance_id) WHERE user_fragrance_id IS NOT NULL;
-- One pending suggestion per user per fragrance
CREATE UNIQUE INDEX IF NOT EXISTS fragrance_submissions_pending_unique
  ON fragrance_submissions (user_id, lower(btrim(brand)), lower(btrim(title)))
  WHERE status = 'pending';

ALTER TABLE fragrance_submissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own submissions (e.g. a future "pending review" badge).
-- No INSERT/UPDATE/DELETE policies: writes go through the RPCs below so the
-- rate cap and triage scoring can't be bypassed.
CREATE POLICY "own submissions" ON fragrance_submissions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Who may review submissions. Membership is managed manually (SQL editor).
CREATE TABLE IF NOT EXISTS moderators (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

-- A user may check their own membership (drives showing a future in-app
-- moderation entry point). Enforcement lives in review_submission, not here.
CREATE POLICY "own membership" ON moderators FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Queue a catalog suggestion. SECURITY DEFINER because clients have no INSERT
-- policy: this is the only write path, enforcing the pending cap, ownership of
-- the linked collection row, and the trigram triage score.
CREATE OR REPLACE FUNCTION submit_fragrance_suggestion(
  p_brand text, p_title text, p_user_fragrance_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_brand text := btrim(p_brand);
  v_title text := btrim(p_title);
  v_match record;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF char_length(v_brand) < 1 OR char_length(v_title) < 1 THEN
    RAISE EXCEPTION 'brand and title are required';
  END IF;
  IF (SELECT count(*) FROM fragrance_submissions
      WHERE user_id = v_uid AND status = 'pending') >= 5 THEN
    RAISE EXCEPTION 'too many pending suggestions';
  END IF;
  IF p_user_fragrance_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_fragrances WHERE id = p_user_fragrance_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'collection row not found';
  END IF;

  -- Same fragrance already pending from this user: idempotent, return it
  SELECT id INTO v_id FROM fragrance_submissions
  WHERE user_id = v_uid AND status = 'pending'
    AND lower(btrim(brand)) = lower(v_brand)
    AND lower(btrim(title)) = lower(v_title);
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT f.id, similarity(f.brand || ' ' || f.name, v_brand || ' ' || v_title) AS sim
  INTO v_match
  FROM fragrances f
  ORDER BY sim DESC
  LIMIT 1;

  INSERT INTO fragrance_submissions
    (user_id, user_fragrance_id, brand, title, similar_fragrance_id, similarity)
  VALUES (v_uid, p_user_fragrance_id, v_brand, v_title, v_match.id, v_match.sim)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Moderator decision, all effects in one transaction:
--   approve -> new fragrances row ('user:<submission-id>' as the source_url
--              dedup key), backfill the submitter's collection row + wear
--              events with the new FK
--   merge   -> same backfill, but onto an existing catalog row (duplicates)
--   reject  -> stamp status/note only; the submitter's personal row is
--              untouched and keeps working
-- Callable from the dashboard SQL editor or a future in-app moderation screen;
-- authorization is the moderators-table check, not UI visibility.
CREATE OR REPLACE FUNCTION review_submission(
  p_submission_id uuid, p_action text,
  p_merge_target uuid DEFAULT NULL, p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  v_frag uuid;
  v_catalog_image text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;

  SELECT * INTO s FROM fragrance_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission not found';
  END IF;
  IF s.status <> 'pending' THEN
    RAISE EXCEPTION 'submission already reviewed (%)', s.status;
  END IF;

  IF p_action = 'approve' THEN
    INSERT INTO fragrances (brand, name, source_url)
    VALUES (btrim(s.brand), btrim(s.title), 'user:' || s.id)
    RETURNING id INTO v_frag;
  ELSIF p_action = 'merge' THEN
    IF p_merge_target IS NULL THEN
      RAISE EXCEPTION 'merge requires a target fragrance id';
    END IF;
    SELECT id INTO v_frag FROM fragrances WHERE id = p_merge_target;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'merge target not found';
    END IF;
  ELSIF p_action = 'reject' THEN
    v_frag := NULL;
  ELSE
    RAISE EXCEPTION 'unknown action % (use approve / merge / reject)', p_action;
  END IF;

  IF v_frag IS NOT NULL AND s.user_fragrance_id IS NOT NULL THEN
    SELECT image_url INTO v_catalog_image FROM fragrances WHERE id = v_frag;
    -- Link the submitter's row; on merge, adopt the catalog image if the
    -- manual add had none. Guard on fragrance_id IS NULL so a row the user
    -- re-linked meanwhile isn't clobbered.
    UPDATE user_fragrances
    SET fragrance_id = v_frag, image_url = COALESCE(image_url, v_catalog_image)
    WHERE id = s.user_fragrance_id AND fragrance_id IS NULL;
    UPDATE wear_events
    SET fragrance_id = v_frag
    WHERE user_fragrance_id = s.user_fragrance_id AND fragrance_id IS NULL;
  END IF;

  UPDATE fragrance_submissions
  SET status = CASE p_action WHEN 'approve' THEN 'approved'
                             WHEN 'merge' THEN 'merged'
                             ELSE 'rejected' END,
      decided_fragrance_id = v_frag,
      moderator_note = p_note,
      reviewed_at = now()
  WHERE id = p_submission_id;

  RETURN v_frag;
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_fragrance_suggestion(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_fragrance_suggestion(text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) TO authenticated;
