-- Opt-in public profiles. A user_profiles row is a client-pushed snapshot of
-- the owner's client-computed gamification state (src/lib/gamification is
-- pure TS — reimplementing streak/badge/level math in SQL would drift), plus
-- identity fields and the profile-header photo path. Private by default;
-- flipping is_public is the only thing that exposes a row to other users.
-- Snapshot fields are self-reported (the owner's client writes them), so
-- they're display/leaderboard data, not an integrity boundary — the CHECKs
-- below just bound garbage. Real wear data for a profile comes from
-- user_top_worn below, which aggregates wear_events server-side.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public          BOOLEAN NOT NULL DEFAULT false,
  display_name       TEXT NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 80),
  avatar_url         TEXT CHECK (avatar_url IS NULL OR (avatar_url LIKE 'https://%' AND char_length(avatar_url) <= 2048)),
  header_image_path  TEXT CHECK (header_image_path IS NULL OR char_length(header_image_path) <= 1024),
  level              INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  xp                 INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  streak             INT NOT NULL DEFAULT 0 CHECK (streak >= 0),
  total_wears        INT NOT NULL DEFAULT 0 CHECK (total_wears >= 0),
  collection_count   INT NOT NULL DEFAULT 0 CHECK (collection_count >= 0),
  badge_ids          TEXT[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(badge_ids, 1), 0) <= 64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Top-collectors leaderboard scan: public rows ordered by xp
CREATE INDEX IF NOT EXISTS user_profiles_public_xp_idx ON user_profiles (xp DESC) WHERE is_public;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public or own profile" ON user_profiles FOR SELECT
  TO authenticated
  USING (is_public OR (SELECT auth.uid()) = user_id);

CREATE POLICY "insert own profile" ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "update own profile" ON user_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "delete own profile" ON user_profiles FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- A public user's most-worn fragrances, aggregated from their real
-- wear_events (own-rows RLS makes cross-user reads impossible directly —
-- same pattern as top_worn_fragrances). Gated: only profiles currently
-- flagged is_public are readable, except the caller's own. Grouped by the
-- denormalized event name so history survives collection-row deletion;
-- max(image_url) prefers a non-null snapshot when older events lack one.
CREATE OR REPLACE FUNCTION user_top_worn(target_user uuid, max_results int DEFAULT 5)
RETURNS TABLE (name text, image_url text, wear_count bigint)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT we.name, max(we.image_url) AS image_url, count(*) AS wear_count
  FROM wear_events we
  WHERE we.user_id = target_user
    AND (
      target_user = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles p
        WHERE p.user_id = target_user AND p.is_public
      )
    )
  GROUP BY we.name
  ORDER BY count(*) DESC, max(we.worn_at) DESC
  LIMIT least(greatest(coalesce(max_results, 5), 1), 20)
$$;

REVOKE EXECUTE ON FUNCTION user_top_worn(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION user_top_worn(uuid, int) TO authenticated;

-- Profile header photos. The bucket is public-read (the photo decorates a
-- profile other users can open; no signed-URL churn), but the path is only
-- discoverable through a user_profiles row, which RLS hides unless
-- is_public. Objects are keyed "<user_id>/<timestamp>.jpg" — every upload is
-- a fresh path (no image-cache staleness), the client deletes the old one.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-headers', 'profile-headers', true, 3145728, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "own profile header select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-headers' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "own profile header insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-headers' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "own profile header delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-headers' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
