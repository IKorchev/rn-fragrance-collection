-- Part 1 — distrust all scraped Parfumo metadata (same poisoning risk as the
-- dropped notes): keep only name/brand (+ image_url, hosted on our own R2 CDN,
-- and source_url, needed for re-scrape dedup).

DROP FUNCTION IF EXISTS search_fragrances(text, text[], text, int);

ALTER TABLE fragrances
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS concentration,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS votes,
  DROP COLUMN IF EXISTS review_count,
  DROP COLUMN IF EXISTS scent_rating,
  DROP COLUMN IF EXISTS longevity_rating,
  DROP COLUMN IF EXISTS sillage_rating,
  DROP COLUMN IF EXISTS bottle_rating,
  DROP COLUMN IF EXISTS accords,
  DROP COLUMN IF EXISTS perfumers,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS in_production,
  DROP COLUMN IF EXISTS rank_position;

-- Text-match-only search (no votes to blend into ranking anymore)
CREATE FUNCTION search_fragrances(
  search_term  text DEFAULT NULL,
  filter_brand text DEFAULT NULL,
  max_results  int  DEFAULT 50
)
RETURNS TABLE (id uuid, name text, brand text, image_url text)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      NULLIF(TRIM(search_term), '') AS term,
      -- escape ILIKE metacharacters so "100%" doesn't become a wildcard
      '%' || REPLACE(REPLACE(REPLACE(NULLIF(TRIM(search_term), ''),
        '\', '\\'), '%', '\%'), '_', '\_') || '%' AS pattern
  )
  SELECT f.id, f.name, f.brand, f.image_url
  FROM fragrances f, params p
  WHERE
    -- no term and no filter -> empty (the app gates this too)
    (p.term IS NOT NULL OR filter_brand IS NOT NULL)
    AND (p.term IS NULL
      OR f.name  ILIKE p.pattern
      OR f.brand ILIKE p.pattern
      OR p.term <<% f.name
      OR p.term <<% f.brand
      OR to_tsvector('english', f.name || ' ' || f.brand)
           @@ websearch_to_tsquery('english', p.term))
    AND (filter_brand IS NULL OR f.brand = filter_brand)
  ORDER BY
    CASE WHEN p.term IS NOT NULL
         THEN GREATEST(
                word_similarity(p.term, f.name),
                word_similarity(p.term, f.brand),
                similarity(f.brand || ' ' || f.name, p.term))
    END DESC NULLS LAST,
    f.brand, f.name, f.id
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;

-- Random slice for the home Discover list (used to be ORDER BY rating, which
-- no longer exists). VOLATILE on purpose: random().
CREATE OR REPLACE FUNCTION discover_fragrances(max_results int DEFAULT 50)
RETURNS TABLE (id uuid, name text, brand text, image_url text)
LANGUAGE sql VOLATILE
SET search_path = public
AS $$
  SELECT f.id, f.name, f.brand, f.image_url
  FROM fragrances f
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;

-- Part 2 — community "most worn" leaderboard. times_worn/last_worn can't
-- answer windowed questions, so each wear now also logs an immutable event.
-- name/image are denormalized so history survives collection-row deletion.

CREATE TABLE wear_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fragrance_id  UUID REFERENCES fragrances(id),  -- null for legacy/no-FK rows
  name          TEXT NOT NULL,                   -- "Brand - Title" snapshot
  image_url     TEXT,
  worn_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wear_events_worn_at_idx ON wear_events (worn_at);

ALTER TABLE wear_events ENABLE ROW LEVEL SECURITY;

-- Users write/read only their own events; the cross-user leaderboard goes
-- through the SECURITY DEFINER aggregate below (no raw rows exposed).
CREATE POLICY "own events" ON wear_events FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- increment_wear now also logs the event. Still SECURITY INVOKER: the UPDATE
-- is RLS-scoped to the caller's rows, so the INSERT inherits a legit user_id.
CREATE OR REPLACE FUNCTION increment_wear(row_id UUID) RETURNS void AS $$
  WITH updated AS (
    UPDATE user_fragrances
    SET times_worn = times_worn + 1, last_worn = now()
    WHERE id = row_id
    RETURNING user_id, fragrance_id, name, image_url
  )
  INSERT INTO wear_events (user_id, fragrance_id, name, image_url)
  SELECT user_id, fragrance_id, name, image_url FROM updated;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

-- Top-100 most worn across ALL users. Windowed periods count wear_events;
-- 'all' sums user_fragrances.times_worn instead so wears from before this
-- migration (no events) still count. Groups by catalog FK when present,
-- else case-insensitive name.
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
      ELSE NULL
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
    WHERE c.t IS NOT NULL AND w.worn_at >= c.t
    GROUP BY 1, w.fragrance_id
    UNION ALL
    SELECT
      COALESCE(u.fragrance_id::text, LOWER(u.name)),
      MAX(u.name),
      MAX(u.image_url),
      u.fragrance_id,
      SUM(u.times_worn)::bigint
    FROM user_fragrances u, cutoff c
    WHERE c.t IS NULL AND u.times_worn > 0
    GROUP BY 1, u.fragrance_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY wear_count DESC, name ASC) AS place,
         name, image_url, fragrance_id, wear_count
  FROM counts
  ORDER BY place
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;

-- Part 3 — the scraped Top-100 lists are dead (table was already empty) and
-- the tab is replaced by the most-worn leaderboard.
DROP TABLE IF EXISTS top_fragrances;
