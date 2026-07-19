-- App schema for rn-fragrance-collection (see db/schema.sql in that repo)

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

-- The app only ever holds the public anon key — RLS keeps each user's rows private.
CREATE POLICY "own rows" ON user_fragrances FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic wear increment (avoids read-modify-write races)
CREATE OR REPLACE FUNCTION increment_wear(row_id UUID) RETURNS void AS $$
  UPDATE user_fragrances
  SET times_worn = times_worn + 1, last_worn = now()
  WHERE id = row_id;
$$ LANGUAGE sql SECURITY INVOKER;

-- Realtime change events for the collection screen
ALTER PUBLICATION supabase_realtime ADD TABLE user_fragrances;

-- Read-only Top 100 lists (interim lift-and-shift; Phase B replaces with the catalog)
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
