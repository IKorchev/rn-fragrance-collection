-- 'all' previously summed live user_fragrances.times_worn, so deleting a
-- collection row erased its wears from the All Time leaderboard (and re-adding
-- reset the count). Count wear_events for every period instead; 'all' is just
-- an unbounded cutoff. No legacy times_worn exceeds its event count, so
-- nothing is lost.
CREATE OR REPLACE FUNCTION top_worn_fragrances(
  period text DEFAULT 'all', max_results int DEFAULT 100
)
RETURNS TABLE (place bigint, name text, image_url text, fragrance_id uuid, wear_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH cutoff AS (
    SELECT CASE period
      WHEN 'day'   THEN now() - interval '1 day'
      WHEN 'week'  THEN now() - interval '7 days'
      WHEN 'month' THEN now() - interval '30 days'
      WHEN 'year'  THEN now() - interval '365 days'
      ELSE '-infinity'::timestamptz
    END AS t
  ),
  counts AS (
    SELECT
      COALESCE(w.fragrance_id::text, LOWER(w.name)) AS grp,
      MAX(w.name) AS name,
      MAX(w.image_url) AS image_url,
      w.fragrance_id,
      COUNT(*)::bigint AS wear_count
    FROM wear_events w, cutoff c
    WHERE w.worn_at >= c.t
    GROUP BY 1, w.fragrance_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY wear_count DESC, name ASC) AS place,
         name, image_url, fragrance_id, wear_count
  FROM counts
  ORDER BY place
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;
