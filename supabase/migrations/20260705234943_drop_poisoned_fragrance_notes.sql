-- Migration 003 — remove fragrance notes: Parfumo serves fabricated note
-- pyramids to scraper-flagged traffic, so an unknown fraction of the scraped
-- notes is fake. Drop the table and the RPC surface that exposes it until a
-- clean re-scrape exists.

DROP FUNCTION IF EXISTS list_notes(text, int);

-- Signature changes (filter_notes removed), so drop + recreate
DROP FUNCTION IF EXISTS search_fragrances(text, text[], text, text[], int);

CREATE FUNCTION search_fragrances(
  search_term   text   DEFAULT NULL,
  filter_genders text[] DEFAULT NULL,
  filter_brand  text   DEFAULT NULL,
  max_results   int    DEFAULT 50
)
RETURNS TABLE (
  id uuid, name text, brand text, image_url text,
  rating numeric, votes int, year int, gender text
)
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
  SELECT f.id, f.name, f.brand, f.image_url, f.rating, f.votes, f.year, f.gender
  FROM fragrances f, params p
  WHERE
    -- no term and no filters -> empty (the app gates this too)
    (p.term IS NOT NULL OR filter_genders IS NOT NULL OR filter_brand IS NOT NULL)
    AND (p.term IS NULL
      OR f.name  ILIKE p.pattern
      OR f.brand ILIKE p.pattern
      OR p.term <<% f.name
      OR p.term <<% f.brand
      OR to_tsvector('english', f.name || ' ' || f.brand)
           @@ websearch_to_tsquery('english', p.term))
    AND (filter_genders IS NULL OR f.gender = ANY (filter_genders))
    AND (filter_brand   IS NULL OR f.brand = filter_brand)
  ORDER BY
    CASE WHEN p.term IS NOT NULL
         THEN GREATEST(
                word_similarity(p.term, f.name),
                word_similarity(p.term, f.brand),
                similarity(f.brand || ' ' || f.name, p.term))
              + LN(1 + COALESCE(f.votes, 0)) / 15
    END DESC NULLS LAST,
    f.votes DESC NULLS LAST,
    f.id
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;

DROP TABLE IF EXISTS fragrance_notes;
