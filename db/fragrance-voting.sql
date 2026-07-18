-- Community fragrance votes. A vote is catalog-linked and can be edited by
-- its owner, but raw rows are never exposed across users; aggregate reads go
-- through get_fragrance_vote_summary() below.
CREATE TABLE IF NOT EXISTS fragrance_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fragrance_id UUID NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  seasons TEXT[] NOT NULL,
  gender TEXT NOT NULL,
  sillage SMALLINT NOT NULL,
  longevity SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fragrance_votes_seasons_values CHECK (
    cardinality(seasons) BETWEEN 1 AND 2
    AND array_position(seasons, NULL) IS NULL
    AND seasons <@ ARRAY['spring', 'summer', 'autumn', 'winter']::text[]
    AND (cardinality(seasons) = 1 OR seasons[1] <> seasons[2])
  ),
  CONSTRAINT fragrance_votes_gender_value CHECK (gender IN ('female', 'unisex', 'male')),
  CONSTRAINT fragrance_votes_sillage_range CHECK (sillage BETWEEN 1 AND 5),
  CONSTRAINT fragrance_votes_longevity_range CHECK (longevity BETWEEN 1 AND 5),
  UNIQUE (user_id, fragrance_id)
);

CREATE INDEX IF NOT EXISTS fragrance_votes_fragrance_id_idx ON fragrance_votes (fragrance_id);
ALTER TABLE fragrance_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fragrance_votes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fragrance_votes TO authenticated;

DROP POLICY IF EXISTS "own votes" ON fragrance_votes;
CREATE POLICY "own votes" ON fragrance_votes FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.set_fragrance_vote_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fragrance_votes_set_updated_at ON fragrance_votes;
CREATE TRIGGER fragrance_votes_set_updated_at
  BEFORE UPDATE ON fragrance_votes FOR EACH ROW
  EXECUTE FUNCTION public.set_fragrance_vote_updated_at();

CREATE OR REPLACE FUNCTION public.get_fragrance_vote_summary(p_fragrance_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_summary jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'total_votes', pg_catalog.count(*)::bigint,
    'seasons', pg_catalog.jsonb_build_object(
      'spring', pg_catalog.count(*) FILTER (WHERE 'spring' = ANY(v.seasons)),
      'summer', pg_catalog.count(*) FILTER (WHERE 'summer' = ANY(v.seasons)),
      'autumn', pg_catalog.count(*) FILTER (WHERE 'autumn' = ANY(v.seasons)),
      'winter', pg_catalog.count(*) FILTER (WHERE 'winter' = ANY(v.seasons))
    ),
    'genders', pg_catalog.jsonb_build_object(
      'female', pg_catalog.count(*) FILTER (WHERE v.gender = 'female'),
      'unisex', pg_catalog.count(*) FILTER (WHERE v.gender = 'unisex'),
      'male', pg_catalog.count(*) FILTER (WHERE v.gender = 'male')
    ),
    'sillage', pg_catalog.jsonb_build_array(
      pg_catalog.count(*) FILTER (WHERE v.sillage = 1),
      pg_catalog.count(*) FILTER (WHERE v.sillage = 2),
      pg_catalog.count(*) FILTER (WHERE v.sillage = 3),
      pg_catalog.count(*) FILTER (WHERE v.sillage = 4),
      pg_catalog.count(*) FILTER (WHERE v.sillage = 5)
    ),
    'longevity', pg_catalog.jsonb_build_array(
      pg_catalog.count(*) FILTER (WHERE v.longevity = 1),
      pg_catalog.count(*) FILTER (WHERE v.longevity = 2),
      pg_catalog.count(*) FILTER (WHERE v.longevity = 3),
      pg_catalog.count(*) FILTER (WHERE v.longevity = 4),
      pg_catalog.count(*) FILTER (WHERE v.longevity = 5)
    ),
    'my_vote', (
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'seasons', v.seasons,
          'gender', v.gender,
          'sillage', v.sillage,
          'longevity', v.longevity
        )
      ) FILTER (WHERE v.user_id = v_uid)
    ) -> 0
  )
  INTO v_summary
  FROM public.fragrance_votes v
  WHERE v.fragrance_id = p_fragrance_id;

  RETURN v_summary;
END;
$$;

REVOKE ALL ON FUNCTION public.set_fragrance_vote_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_fragrance_vote_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fragrance_vote_summary(uuid) TO authenticated;