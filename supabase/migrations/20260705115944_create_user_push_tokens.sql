-- Expo push tokens, one row per device token. A token is globally unique;
-- upserting on token lets a device that switches accounts re-home its token.
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tokens" ON user_push_tokens FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
