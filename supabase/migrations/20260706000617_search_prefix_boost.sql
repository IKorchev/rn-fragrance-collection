-- Without scraped votes there is no popularity signal, so ties on word
-- similarity ("sauvage" matches every Sauvage flanker/clone equally) fell back
-- to alphabetical brand order. Boost term-prefix matches on name/brand and
-- prefer shorter (more canonical) names as the tiebreak.
CREATE OR REPLACE FUNCTION search_fragrances(
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
      REPLACE(REPLACE(REPLACE(NULLIF(TRIM(search_term), ''),
        '\', '\\'), '%', '\%'), '_', '\_') AS esc
  )
  SELECT f.id, f.name, f.brand, f.image_url
  FROM fragrances f, params p
  WHERE
    -- no term and no filter -> empty (the app gates this too)
    (p.term IS NOT NULL OR filter_brand IS NOT NULL)
    AND (p.term IS NULL
      OR f.name  ILIKE '%' || p.esc || '%'
      OR f.brand ILIKE '%' || p.esc || '%'
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
              + CASE WHEN f.name  ILIKE p.esc || '%'
                       OR f.brand ILIKE p.esc || '%' THEN 0.3 ELSE 0 END
    END DESC NULLS LAST,
    LENGTH(f.name), f.brand, f.name, f.id
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;
