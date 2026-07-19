-- The app only calls the leaderboard signed-in; no reason to expose the
-- SECURITY DEFINER aggregate to anonymous clients (security advisor 0028).
REVOKE EXECUTE ON FUNCTION top_worn_fragrances(text, int) FROM anon;
