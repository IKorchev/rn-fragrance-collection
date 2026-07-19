-- Moderation queue read for the in-app moderation screen. RLS only lets a
-- user see their own fragrance_submissions rows ("own submissions" policy),
-- so a moderator needs a SECURITY DEFINER path to list everyone's pending
-- rows — mirrors review_submission's moderator gate.
CREATE OR REPLACE FUNCTION list_pending_submissions(p_max_results integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  brand text,
  title text,
  created_at timestamptz,
  similarity real,
  similar_fragrance_id uuid,
  similar_brand text,
  similar_name text,
  similar_image_url text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;

  RETURN QUERY
  SELECT fs.id, fs.brand, fs.title, fs.created_at, fs.similarity, fs.similar_fragrance_id,
         f.brand, f.name, f.image_url
  FROM fragrance_submissions fs
  LEFT JOIN fragrances f ON f.id = fs.similar_fragrance_id
  WHERE fs.status = 'pending'
  ORDER BY fs.created_at
  LIMIT p_max_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION list_pending_submissions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_pending_submissions(integer) TO authenticated;
