-- Review fixes for the submission feature: dashboard-usable review gate,
-- NULL-safe validation, race-free cap/dedup, index-assisted triage match,
-- and a single transactional RPC for the manual-add + suggestion pairing.

-- KNN support for the closest-match triage lookup: ORDER BY <-> can use a
-- GiST trgm index; the existing GIN indexes only serve % / LIKE filters.
CREATE INDEX IF NOT EXISTS fragrances_brand_name_trgm_gist_idx
  ON fragrances USING gist ((brand || ' ' || name) gist_trgm_ops);

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
  -- coalesce: char_length(NULL) is NULL, which would slip past a bare < 1
  IF coalesce(char_length(v_brand), 0) < 1 OR coalesce(char_length(v_title), 0) < 1 THEN
    RAISE EXCEPTION 'brand and title are required';
  END IF;
  -- Serialize this user's submissions so concurrent calls can't race the
  -- pending cap (count-then-insert is not atomic on its own)
  PERFORM pg_advisory_xact_lock(hashtext('fragrance_submissions'), hashtext(v_uid::text));
  IF (SELECT count(*) FROM fragrance_submissions
      WHERE user_id = v_uid AND status = 'pending') >= 5 THEN
    RAISE EXCEPTION 'too many pending suggestions';
  END IF;
  IF p_user_fragrance_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_fragrances WHERE id = p_user_fragrance_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'collection row not found';
  END IF;

  -- Closest catalog match for triage. KNN over the GiST expression index —
  -- similarity() is only evaluated for the single row the index returns.
  SELECT f.id, similarity(f.brand || ' ' || f.name, v_brand || ' ' || v_title) AS sim
  INTO v_match
  FROM fragrances f
  ORDER BY (f.brand || ' ' || f.name) <-> (v_brand || ' ' || v_title)
  LIMIT 1;

  -- Same fragrance already pending from this user: idempotent, return the
  -- existing row. ON CONFLICT (arbitrated by fragrance_submissions_pending_unique)
  -- keeps this race-free without a separate SELECT.
  INSERT INTO fragrance_submissions
    (user_id, user_fragrance_id, brand, title, similar_fragrance_id, similarity)
  VALUES (v_uid, p_user_fragrance_id, v_brand, v_title, v_match.id, v_match.sim)
  ON CONFLICT (user_id, lower(btrim(brand)), lower(btrim(title))) WHERE status = 'pending'
  DO UPDATE SET user_fragrance_id =
    coalesce(fragrance_submissions.user_fragrance_id, EXCLUDED.user_fragrance_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

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
  -- auth.uid() is NULL when there is no JWT — i.e. the dashboard SQL editor
  -- (session_user postgres), which is trusted. PostgREST callers always carry
  -- a JWT and must be in moderators.
  IF NOT (
    (auth.uid() IS NULL AND session_user = 'postgres')
    OR EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid())
  ) THEN
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

-- The manual-add path: one transaction inserts the personal collection row
-- and queues the catalog suggestion, so the pairing can't be half-lost
-- between two client calls (kill/offline after the first). The suggestion is
-- best-effort (subtransaction): a full pending queue never fails the add.
CREATE OR REPLACE FUNCTION add_manual_fragrance(p_brand text, p_title text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_brand text := btrim(p_brand);
  v_title text := btrim(p_title);
  v_row_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF coalesce(char_length(v_brand), 0) < 1 OR coalesce(char_length(v_title), 0) < 1 THEN
    RAISE EXCEPTION 'brand and title are required';
  END IF;
  -- SECURITY INVOKER: the insert runs under the caller's own-rows RLS policy
  INSERT INTO user_fragrances (user_id, name, image_url, fragrance_id, times_worn)
  VALUES (auth.uid(), v_brand || ' - ' || v_title, NULL, NULL, 0)
  RETURNING id INTO v_row_id;
  BEGIN
    PERFORM submit_fragrance_suggestion(v_brand, v_title, v_row_id);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- best-effort: never fail the personal add over the suggestion
  END;
  RETURN v_row_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION add_manual_fragrance(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_manual_fragrance(text, text) TO authenticated;
