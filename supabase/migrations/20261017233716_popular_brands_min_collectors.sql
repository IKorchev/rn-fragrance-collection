-- popular_brands: a brand only ranks once at least 3 distinct collectors own or
-- wishlist it. With a handful of users, "popular" otherwise just mirrors one
-- person's shelf — noisy, and close to revealing what a specific user owns.
-- Below the threshold the client fills the list from its featured brands.
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
    HAVING COUNT(DISTINCT h.user_id) >= 3
    ORDER BY collectors DESC, h.brand
    LIMIT GREATEST(1, LEAST(max_results, 50))
  )
  SELECT r.brand,
         (SELECT COUNT(*) FROM fragrances f WHERE lower(f.brand) = lower(r.brand) AND f.brand = r.brand)::bigint
  FROM ranked r
  ORDER BY r.collectors DESC, r.brand
$$;

REVOKE EXECUTE ON FUNCTION popular_brands(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION popular_brands(int) TO authenticated;
