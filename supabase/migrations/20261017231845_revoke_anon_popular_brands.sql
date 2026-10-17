-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- directly, not only through PUBLIC — so search_tab_browse's REVOKE FROM
-- PUBLIC left anon able to call popular_brands. Revoke both.
REVOKE EXECUTE ON FUNCTION popular_brands(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION popular_brands(int) TO authenticated;
