-- Better matching + ranking for search_fragrances:
-- * <<% (strict word similarity, GIN-index-backed, default threshold 0.5)
--   so long names with qualifiers ("Sauvage (Eau de Parfum)") still match
--   typo'd terms like "savage" that full-string similarity dilutes away
-- * similarity against "brand || name" so cross-field terms ("dior sauvage") rank
-- * log-votes popularity blended into the score so popular fragrances beat
--   obscure equal-text matches

CREATE OR REPLACE FUNCTION search_fragrances(
  search_term   text   DEFAULT NULL,
  filter_genders text[] DEFAULT NULL,
  filter_brand  text   DEFAULT NULL,
  filter_notes  text[] DEFAULT NULL,
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
  ),
  note_matches AS (
    -- match-ALL notes: aggregate per fragrance, compare against the count
    -- of DISTINCT requested notes (duplicate-input safe)
    SELECT fn.fragrance_id
    FROM fragrance_notes fn
    WHERE filter_notes IS NOT NULL AND fn.note = ANY (filter_notes)
    GROUP BY fn.fragrance_id
    HAVING COUNT(DISTINCT fn.note) =
           (SELECT COUNT(DISTINCT x) FROM UNNEST(filter_notes) AS t(x))
  )
  SELECT f.id, f.name, f.brand, f.image_url, f.rating, f.votes, f.year, f.gender
  FROM fragrances f, params p
  WHERE
    -- no term and no filters -> empty (the app gates this too)
    (p.term IS NOT NULL OR filter_genders IS NOT NULL
      OR filter_brand IS NOT NULL OR filter_notes IS NOT NULL)
    AND (p.term IS NULL
      OR f.name  ILIKE p.pattern
      OR f.brand ILIKE p.pattern
      OR p.term <<% f.name
      OR p.term <<% f.brand
      OR to_tsvector('english', f.name || ' ' || f.brand)
           @@ websearch_to_tsquery('english', p.term))
    AND (filter_genders IS NULL OR f.gender = ANY (filter_genders))
    AND (filter_brand   IS NULL OR f.brand = filter_brand)
    AND (filter_notes   IS NULL OR f.id IN (SELECT fragrance_id FROM note_matches))
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
