-- Deploy this idempotent migration in the Supabase SQL editor.
-- Keep in sync with the Personalized recommendations section in db/schema.sql.

-- ---------------------------------------------------------------------------
-- Personalized recommendations
-- ---------------------------------------------------------------------------
-- Recommendation reads never aggregate raw wear_events/fragrance_ratings.
-- This compact rollup is maintained incrementally by AFTER triggers, then read
-- only through recommend_fragrances(). Recent wear uses a 30-day half-life.
-- Contributions are stored relative to a fixed epoch, making their ordering
-- time-invariant and therefore B-tree indexable; the common decay back to
-- "now" is applied only to the small candidate set inside the RPC.
BEGIN;

CREATE TABLE IF NOT EXISTS fragrance_community_stats (
  fragrance_id       uuid PRIMARY KEY REFERENCES fragrances(id) ON DELETE CASCADE,
  wear_count          bigint NOT NULL DEFAULT 0 CHECK (wear_count >= 0),
  recent_wear_weight  double precision NOT NULL DEFAULT 0 CHECK (recent_wear_weight >= 0),
  last_worn_at        timestamptz,
  rating_sum          bigint NOT NULL DEFAULT 0,
  rating_count        bigint NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fragrance_community_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fragrance_community_stats FROM PUBLIC, anon, authenticated;

-- Candidate reads use these orderings directly. Brand affinity joins use the
-- expression index rather than scanning the catalog for lower(brand).
CREATE INDEX IF NOT EXISTS fragrance_community_stats_popularity_idx
  ON fragrance_community_stats (recent_wear_weight DESC, wear_count DESC, fragrance_id);
CREATE INDEX IF NOT EXISTS fragrances_lower_brand_id_idx
  ON fragrances (lower(brand), id);
CREATE INDEX IF NOT EXISTS wear_events_fragrance_worn_at_idx
  ON wear_events (fragrance_id, worn_at DESC)
  WHERE fragrance_id IS NOT NULL;

CREATE OR REPLACE FUNCTION recommendation_wear_weight(p_worn_at timestamptz)
RETURNS double precision
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT exp(
    ln(2.0) * extract(epoch FROM (p_worn_at - timestamptz '2025-01-01 00:00:00+00'))
    / (30.0 * 86400.0)
  )
$$;

-- Increment/decrement the wear rollup. UPDATE support matters when moderation
-- backfills wear_events.fragrance_id after approving/merging a submission.
CREATE OR REPLACE FUNCTION update_fragrance_community_wear_stats()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.fragrance_id IS NOT NULL THEN
    UPDATE fragrance_community_stats s
    SET wear_count = greatest(s.wear_count - 1, 0),
        recent_wear_weight = greatest(
          s.recent_wear_weight - recommendation_wear_weight(OLD.worn_at),
          0
        ),
        last_worn_at = (
          SELECT max(w.worn_at)
          FROM wear_events w
          WHERE w.fragrance_id = OLD.fragrance_id
        ),
        updated_at = now()
    WHERE s.fragrance_id = OLD.fragrance_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.fragrance_id IS NOT NULL THEN
    INSERT INTO fragrance_community_stats (
      fragrance_id, wear_count, recent_wear_weight, last_worn_at, updated_at
    )
    VALUES (
      NEW.fragrance_id, 1, recommendation_wear_weight(NEW.worn_at), NEW.worn_at, now()
    )
    ON CONFLICT (fragrance_id) DO UPDATE
    SET wear_count = fragrance_community_stats.wear_count + 1,
        recent_wear_weight = fragrance_community_stats.recent_wear_weight
          + recommendation_wear_weight(NEW.worn_at),
        last_worn_at = greatest(fragrance_community_stats.last_worn_at, NEW.worn_at),
        updated_at = now();
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Maintain rating_sum/rating_count with O(1) writes. UPDATE is implemented as
-- subtract-old/add-new, covering both a changed star value and a changed FK.
CREATE OR REPLACE FUNCTION update_fragrance_community_rating_stats()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    UPDATE fragrance_community_stats s
    SET rating_sum = s.rating_sum - OLD.rating,
        rating_count = greatest(s.rating_count - 1, 0),
        updated_at = now()
    WHERE s.fragrance_id = OLD.fragrance_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO fragrance_community_stats (
      fragrance_id, rating_sum, rating_count, updated_at
    )
    VALUES (NEW.fragrance_id, NEW.rating, 1, now())
    ON CONFLICT (fragrance_id) DO UPDATE
    SET rating_sum = fragrance_community_stats.rating_sum + NEW.rating,
        rating_count = fragrance_community_stats.rating_count + 1,
        updated_at = now();
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Lock writes briefly so the one-time backfill and trigger installation cannot
-- miss events/ratings committed between those two steps.
LOCK TABLE wear_events, fragrance_ratings IN SHARE ROW EXCLUSIVE MODE;

WITH wear_stats AS (
  SELECT
    fragrance_id,
    count(*)::bigint AS wear_count,
    coalesce(sum(recommendation_wear_weight(worn_at)), 0)::double precision
      AS recent_wear_weight,
    max(worn_at) AS last_worn_at
  FROM wear_events
  WHERE fragrance_id IS NOT NULL
  GROUP BY fragrance_id
),
rating_stats AS (
  SELECT
    fragrance_id,
    sum(rating)::bigint AS rating_sum,
    count(*)::bigint AS rating_count
  FROM fragrance_ratings
  GROUP BY fragrance_id
),
stat_ids AS (
  SELECT fragrance_id FROM wear_stats
  UNION
  SELECT fragrance_id FROM rating_stats
)
INSERT INTO fragrance_community_stats (
  fragrance_id,
  wear_count,
  recent_wear_weight,
  last_worn_at,
  rating_sum,
  rating_count,
  updated_at
)
SELECT
  ids.fragrance_id,
  coalesce(w.wear_count, 0),
  coalesce(w.recent_wear_weight, 0),
  w.last_worn_at,
  coalesce(r.rating_sum, 0),
  coalesce(r.rating_count, 0),
  now()
FROM stat_ids ids
LEFT JOIN wear_stats w USING (fragrance_id)
LEFT JOIN rating_stats r USING (fragrance_id)
ON CONFLICT (fragrance_id) DO UPDATE
SET wear_count = EXCLUDED.wear_count,
    recent_wear_weight = EXCLUDED.recent_wear_weight,
    last_worn_at = EXCLUDED.last_worn_at,
    rating_sum = EXCLUDED.rating_sum,
    rating_count = EXCLUDED.rating_count,
    updated_at = now();

DROP TRIGGER IF EXISTS wear_events_community_stats ON wear_events;
CREATE TRIGGER wear_events_community_stats
  AFTER INSERT OR DELETE OR UPDATE OF fragrance_id, worn_at ON wear_events
  FOR EACH ROW EXECUTE FUNCTION update_fragrance_community_wear_stats();

DROP TRIGGER IF EXISTS fragrance_ratings_community_stats ON fragrance_ratings;
CREATE TRIGGER fragrance_ratings_community_stats
  AFTER INSERT OR DELETE OR UPDATE OF fragrance_id, rating ON fragrance_ratings
  FOR EACH ROW EXECUTE FUNCTION update_fragrance_community_rating_stats();

-- One authenticated endpoint: candidate generation, exclusion, scoring,
-- explanations, rating/popularity metadata, and brand diversification all run
-- in Postgres. Preferred-brand and popularity pools are index-backed; catalog
-- exploration is two UUID primary-key seeks rather than ORDER BY random().
CREATE OR REPLACE FUNCTION recommend_fragrances(max_results integer DEFAULT 20)
RETURNS TABLE (
  fragrance_id uuid,
  brand text,
  title text,
  image_url text,
  score double precision,
  reason text,
  wear_count bigint,
  avg_rating double precision,
  rating_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(max_results, 20), 50));
  v_hash text;
  v_seed uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Stable for a user/day: refreshes exploration daily without changing every
  -- render, while preserving an indexable UUID seek into fragrances_pkey.
  v_hash := md5(v_uid::text || current_date::text);
  v_seed := (
    substr(v_hash, 1, 8) || '-' || substr(v_hash, 9, 4) || '-' ||
    substr(v_hash, 13, 4) || '-' || substr(v_hash, 17, 4) || '-' ||
    substr(v_hash, 21, 12)
  )::uuid;

  RETURN QUERY
  WITH owned AS (
    SELECT uf.fragrance_id, lower(uf.name) AS name_key
    FROM user_fragrances uf
    WHERE uf.user_id = v_uid
  ),
  preference_signals AS (
    SELECT
      lower(coalesce(f.brand, split_part(uf.name, ' - ', 1))) AS brand_key,
      greatest(
        0::double precision,
        (CASE
          WHEN coalesce(ur.rating, uf.rating) IS NULL THEN 0.5
          ELSE coalesce(ur.rating, uf.rating)::double precision - 3.0
        END)
        + ln(1.0 + greatest(uf.times_worn, 0)::double precision) * 0.65
        + CASE WHEN uf.last_worn >= now() - interval '30 days' THEN 0.25 ELSE 0 END
      ) AS affinity
    FROM user_fragrances uf
    LEFT JOIN fragrances f ON f.id = uf.fragrance_id
    LEFT JOIN fragrance_ratings ur
      ON ur.user_id = v_uid AND ur.fragrance_id = uf.fragrance_id
    WHERE uf.user_id = v_uid
  ),
  preferred_brands AS (
    SELECT ps.brand_key, sum(ps.affinity)::double precision AS affinity
    FROM preference_signals ps
    WHERE ps.brand_key <> '' AND ps.affinity > 0
    GROUP BY ps.brand_key
    ORDER BY affinity DESC
    LIMIT 8
  ),
  affinity_candidates AS (
    SELECT f.id AS fragrance_id, pb.affinity
    FROM preferred_brands pb
    JOIN fragrances f ON lower(f.brand) = pb.brand_key
    LEFT JOIN fragrance_community_stats s ON s.fragrance_id = f.id
    WHERE NOT EXISTS (
      SELECT 1 FROM owned o
      WHERE o.fragrance_id = f.id
         OR o.name_key = lower(f.brand || ' - ' || f.name)
    )
    ORDER BY pb.affinity DESC,
             s.recent_wear_weight DESC NULLS LAST,
             s.wear_count DESC NULLS LAST,
             f.id
    LIMIT 240
  ),
  popular_candidates AS (
    SELECT s.fragrance_id, 0::double precision AS affinity
    FROM fragrance_community_stats s
    JOIN fragrances f ON f.id = s.fragrance_id
    WHERE NOT EXISTS (
      SELECT 1 FROM owned o
      WHERE o.fragrance_id = s.fragrance_id
         OR o.name_key = lower(f.brand || ' - ' || f.name)
    )
      AND (s.wear_count > 0 OR s.rating_count > 0)
    ORDER BY s.recent_wear_weight DESC, s.wear_count DESC, s.fragrance_id
    LIMIT 240
  ),
  explore_forward AS (
    SELECT f.id AS fragrance_id, 0::double precision AS affinity
    FROM fragrances f
    WHERE f.id >= v_seed
      AND NOT EXISTS (
        SELECT 1 FROM owned o
        WHERE o.fragrance_id = f.id
           OR o.name_key = lower(f.brand || ' - ' || f.name)
      )
    ORDER BY f.id
    LIMIT 120
  ),
  explore_wrap AS (
    SELECT f.id AS fragrance_id, 0::double precision AS affinity
    FROM fragrances f
    WHERE f.id < v_seed
      AND NOT EXISTS (
        SELECT 1 FROM owned o
        WHERE o.fragrance_id = f.id
           OR o.name_key = lower(f.brand || ' - ' || f.name)
      )
    ORDER BY f.id
    LIMIT greatest(0, 120 - (SELECT count(*) FROM explore_forward))
  ),
  candidate_pool AS (
    SELECT candidates.fragrance_id, max(candidates.affinity)::double precision AS affinity
    FROM (
      SELECT * FROM affinity_candidates
      UNION ALL
      SELECT * FROM popular_candidates
      UNION ALL
      SELECT * FROM explore_forward
      UNION ALL
      SELECT * FROM explore_wrap
    ) candidates
    GROUP BY candidates.fragrance_id
  ),
  score_inputs AS (
    SELECT
      f.id AS fragrance_id,
      f.brand,
      f.name AS title,
      f.image_url,
      cp.affinity,
      coalesce(s.wear_count, 0)::bigint AS wear_count,
      coalesce(s.rating_count, 0)::bigint AS rating_count,
      CASE WHEN coalesce(s.rating_count, 0) > 0
        THEN s.rating_sum::double precision / s.rating_count::double precision
        ELSE NULL
      END AS avg_rating,
      (
        ln(1.0 + coalesce(s.wear_count, 0)::double precision)
        + 2.0 * ln(
          1.0 + coalesce(s.recent_wear_weight, 0)
          / recommendation_wear_weight(now())
        )
      ) AS popularity_raw,
      (
        (
          coalesce(s.rating_sum, 0)::double precision + 3.5 * 5.0
        ) / (coalesce(s.rating_count, 0)::double precision + 5.0) - 1.0
      ) / 4.0 AS rating_score,
      coalesce((SELECT max(pb.affinity) FROM preferred_brands pb), 0) AS max_affinity,
      EXISTS (SELECT 1 FROM preferred_brands) AS has_preferences
    FROM candidate_pool cp
    JOIN fragrances f ON f.id = cp.fragrance_id
    LEFT JOIN fragrance_community_stats s ON s.fragrance_id = cp.fragrance_id
  ),
  normalized AS (
    SELECT
      si.*,
      CASE WHEN si.max_affinity > 0 THEN si.affinity / si.max_affinity ELSE 0 END
        AS affinity_score,
      CASE WHEN max(si.popularity_raw) OVER () > 0
        THEN si.popularity_raw / max(si.popularity_raw) OVER ()
        ELSE 0
      END AS popularity_score
    FROM score_inputs si
  ),
  scored AS (
    SELECT
      n.*,
      CASE WHEN n.has_preferences
        THEN n.affinity_score * 0.52 + n.popularity_score * 0.30 + n.rating_score * 0.18
        ELSE n.popularity_score * 0.65 + n.rating_score * 0.35
      END::double precision AS final_score,
      CASE
        WHEN n.affinity_score > 0 THEN 'Matches your interest in ' || n.brand
        WHEN coalesce(n.avg_rating, 0) >= 4.2 AND n.rating_count >= 5
          THEN 'Highly rated by the community'
        WHEN n.wear_count > 0 THEN 'Popular with fragrance collectors'
        ELSE 'A new scent to explore'
      END AS recommendation_reason
    FROM normalized n
  ),
  diversified AS (
    SELECT
      s.*,
      row_number() OVER (
        PARTITION BY lower(s.brand)
        ORDER BY s.final_score DESC, s.fragrance_id
      ) AS brand_rank
    FROM scored s
  )
  SELECT
    d.fragrance_id,
    d.brand,
    d.title,
    d.image_url,
    d.final_score,
    d.recommendation_reason,
    d.wear_count,
    d.avg_rating,
    d.rating_count
  FROM diversified d
  WHERE d.brand_rank <= 3
  ORDER BY d.final_score DESC, d.fragrance_id
  LIMIT v_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION recommendation_wear_weight(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_fragrance_community_wear_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_fragrance_community_rating_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION recommend_fragrances(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION recommend_fragrances(integer) TO authenticated;

COMMIT;
