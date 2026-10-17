-- Browse content for the Search tab's idle state.

-- Explore: a random slice of the catalog, now only rows with a photo — 83% of
-- the catalog has none, and a blank tile makes a poor suggestion. Same
-- signature, so CREATE OR REPLACE keeps the existing grants.
CREATE OR REPLACE FUNCTION discover_fragrances(max_results int DEFAULT 50)
RETURNS TABLE (id uuid, name text, brand text, image_url text)
LANGUAGE sql VOLATILE
SET search_path = public
AS $$
  SELECT f.id, f.name, f.brand, f.image_url
  FROM fragrances f
  WHERE f.image_url IS NOT NULL
  ORDER BY random()
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;

-- Popular brands: catalog brands ranked by how many distinct collectors own or
-- wishlist something from them. Cross-user, so SECURITY DEFINER like
-- top_worn_fragrances — but it returns only the brand and its catalog size,
-- never per-user rows or the collector counts themselves.
CREATE OR REPLACE FUNCTION popular_brands(max_results int DEFAULT 12)
RETURNS TABLE (brand text, fragrance_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH holders AS (
    SELECT f.brand, uf.user_id
    FROM user_fragrances uf
    JOIN fragrances f ON f.id = uf.fragrance_id
    UNION
    SELECT f.brand, w.user_id
    FROM wishlist_items w
    JOIN fragrances f ON f.id = w.fragrance_id
  ),
  ranked AS (
    SELECT h.brand, COUNT(DISTINCT h.user_id) AS collectors
    FROM holders h
    GROUP BY h.brand
    ORDER BY collectors DESC, h.brand
    LIMIT GREATEST(1, LEAST(max_results, 50))
  )
  SELECT r.brand,
         (SELECT COUNT(*) FROM fragrances f WHERE lower(f.brand) = lower(r.brand) AND f.brand = r.brand)::bigint
  FROM ranked r
  ORDER BY r.collectors DESC, r.brand
$$;

-- A new function grants EXECUTE to PUBLIC by default, and anon inherits it —
-- revoke PUBLIC and re-grant authenticated (see migrations/README.md).
REVOKE EXECUTE ON FUNCTION popular_brands(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION popular_brands(int) TO authenticated;
