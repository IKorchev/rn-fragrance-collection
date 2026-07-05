-- App schema for rn-fragrance-collection.
-- Run once in the Supabase SQL editor, in the SAME project as fragrance-db's
-- schema (its `fragrances` table is referenced below).

-- A user's personal collection. Replaces Firestore users/{uid}/perfumes.
CREATE TABLE IF NOT EXISTS user_fragrances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fragrance_id  UUID REFERENCES fragrances(id),   -- nullable; backfilled in Phase B
  name          TEXT NOT NULL,                    -- "Brand - Title", split on " - " at render time
  image_url     TEXT,
  times_worn    INT NOT NULL DEFAULT 0,
  last_worn     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_fragrances ENABLE ROW LEVEL SECURITY;

-- The app only ever holds the public anon key — RLS is what keeps each user's
-- rows private (the Firestore-security-rules equivalent).
CREATE POLICY "own rows" ON user_fragrances FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic wear increment (avoids read-modify-write races)
CREATE OR REPLACE FUNCTION increment_wear(row_id UUID) RETURNS void AS $$
  UPDATE user_fragrances
  SET times_worn = times_worn + 1, last_worn = now()
  WHERE id = row_id;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

-- Realtime change events for the collection screen (postgres_changes needs the
-- table in the supabase_realtime publication).
ALTER PUBLICATION supabase_realtime ADD TABLE user_fragrances;

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

-- Daily wear-reminder push (supabase/functions/send-wear-reminder). pg_cron
-- invokes the edge function through pg_net; the project URL and anon key are
-- read from Vault so no keys live in this file — create the two secrets once
-- (dashboard → Vault, or the commented lines below) before scheduling.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- SELECT vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
-- SELECT vault.create_secret('<anon key>', 'anon_key');

SELECT cron.schedule(
  'send-wear-reminder-daily',
  '0 6 * * *',  -- 06:00 UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-wear-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Read-only Top 100 lists. Replaces Firestore top-{men|women|unisex}.
-- Interim lift-and-shift of the old scraped data; Phase B replaces this with
-- queries against the real `fragrances` catalog.
CREATE TABLE IF NOT EXISTS top_fragrances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,   -- 'men' | 'women' | 'unisex'
  place       INT,
  name        TEXT NOT NULL,
  image_url   TEXT,
  rating      NUMERIC,
  total_votes INT
);

ALTER TABLE top_fragrances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON top_fragrances FOR SELECT USING (true);
