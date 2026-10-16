-- XP/levels were retired in the app; the Collectors leaderboard now ranks by
-- total_wears. The level/xp columns stay for now because 1.3.x binaries still
-- write them, but nothing reads them any more.
DROP INDEX IF EXISTS user_profiles_public_xp_idx;
CREATE INDEX IF NOT EXISTS user_profiles_public_total_wears_idx
  ON user_profiles (total_wears DESC) WHERE is_public;
