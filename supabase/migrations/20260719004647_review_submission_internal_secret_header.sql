-- notify-submission-decision now expects the shared internal secret; the
-- best-effort push block gains the same x-internal-secret header the
-- wear-reminder cron sends. Function body otherwise unchanged.
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

  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
             || '/functions/v1/notify-submission-decision',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_fn_secret')
      ),
      body := jsonb_build_object('submission_id', p_submission_id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_frag;
END;
$$;

REVOKE EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) TO authenticated;
