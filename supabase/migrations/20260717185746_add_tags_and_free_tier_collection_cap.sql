-- Personal tags — organize/filter your own collection (picker filters,
-- collection tab, wear history). Stored directly on user_fragrances rather
-- than a separate tags table: already RLS-scoped via the "own rows" policy,
-- and the whole collection is loaded client-side anyway
-- (AuthContext.userCollection), so there's no server-side facet query to
-- optimize for. Normalized (lowercase/trimmed/deduped/capped) both here and
-- client-side (src/lib/utils/tags.ts) so the two stay in lockstep.
CREATE OR REPLACE FUNCTION valid_tag_array(tags text[])
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  t text;
  n int := coalesce(array_length(tags, 1), 0);
  distinct_n int;
BEGIN
  IF n > 12 THEN
    RETURN false;
  END IF;
  FOREACH t IN ARRAY tags LOOP
    IF char_length(t) < 1 OR char_length(t) > 24 OR t <> lower(btrim(t)) THEN
      RETURN false;
    END IF;
  END LOOP;
  SELECT count(DISTINCT x) INTO distinct_n FROM unnest(tags) x;
  RETURN distinct_n = n;
END;
$$;

ALTER TABLE user_fragrances ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE user_fragrances DROP CONSTRAINT IF EXISTS user_fragrances_tags_valid;
ALTER TABLE user_fragrances ADD CONSTRAINT user_fragrances_tags_valid CHECK (valid_tag_array(tags));

CREATE INDEX IF NOT EXISTS user_fragrances_tags_gin_idx ON user_fragrances USING gin (tags);

-- Free-tier collection cap (server-side enforcement — this is exactly what
-- the `subscriptions` table's doc comment flagged it for). Free accounts top
-- out at 40 fragrances; Pro is unlimited. RLS already restricts INSERTs on
-- this table to the caller's own user_id, so reading `subscriptions` for that
-- same id needs no elevated privileges — SECURITY INVOKER (the default).
CREATE OR REPLACE FUNCTION enforce_free_tier_collection_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pro boolean;
  current_count int;
BEGIN
  SELECT s.is_pro INTO pro FROM subscriptions s WHERE s.user_id = NEW.user_id;
  IF coalesce(pro, false) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO current_count FROM user_fragrances WHERE user_id = NEW.user_id;
  IF current_count >= 40 THEN
    -- Matched verbatim by the client (src/lib/entitlements.ts) to show an
    -- upgrade prompt instead of a generic "something went wrong" error.
    RAISE EXCEPTION 'free_tier_collection_limit';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_fragrances_free_tier_cap ON user_fragrances;
CREATE TRIGGER user_fragrances_free_tier_cap
  BEFORE INSERT ON user_fragrances
  FOR EACH ROW EXECUTE FUNCTION enforce_free_tier_collection_cap();
