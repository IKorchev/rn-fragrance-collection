-- Cover FKs flagged by the performance advisor (join/cascade-delete perf).
CREATE INDEX IF NOT EXISTS user_fragrances_fragrance_id_idx ON user_fragrances (fragrance_id);
CREATE INDEX IF NOT EXISTS user_fragrances_user_id_idx ON user_fragrances (user_id);
CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx ON user_push_tokens (user_id);
CREATE INDEX IF NOT EXISTS wear_events_fragrance_id_idx ON wear_events (fragrance_id);
CREATE INDEX IF NOT EXISTS wear_events_user_id_idx ON wear_events (user_id);

-- auth.uid() was being re-evaluated per row; wrap in a subquery so Postgres
-- evaluates it once per statement (same pattern the other two policies
-- already use).
DROP POLICY "own rows" ON user_fragrances;
CREATE POLICY "own rows" ON user_fragrances FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
