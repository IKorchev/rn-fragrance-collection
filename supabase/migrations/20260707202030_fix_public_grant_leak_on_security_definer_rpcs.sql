-- REVOKE ... FROM anon alone doesn't actually block anon: Postgres grants
-- EXECUTE to the PUBLIC pseudo-role by default on function creation, and anon
-- (like every role) implicitly has whatever PUBLIC has. The earlier
-- "revoke_anon_top_worn_fragrances" migration left that PUBLIC grant in place,
-- so both this function and the just-added get_fragrance_ratings were still
-- callable by anon. Revoke from PUBLIC and re-grant explicitly to authenticated.
revoke execute on function top_worn_fragrances(text, int) from public;
grant execute on function top_worn_fragrances(text, int) to authenticated;

revoke execute on function get_fragrance_ratings(uuid[]) from public;
grant execute on function get_fragrance_ratings(uuid[]) to authenticated;
