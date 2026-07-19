-- Catalog schema from the fragrance-db scraper project
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS fragrances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  brand            TEXT NOT NULL,
  year             INT,
  gender           TEXT,           -- 'men' | 'women' | 'unisex'
  concentration    TEXT,           -- 'Eau de Parfum', 'Eau de Toilette', 'Extrait de Parfum', …
  image_url        TEXT,           -- R2 CDN URL (never the scraped site's URL)
  source_url       TEXT UNIQUE,    -- original parfumo URL — used for dedup / re-scrape
  rating           NUMERIC(3, 2),  -- overall community rating (0–10)
  votes            INT,
  review_count     INT,
  scent_rating     NUMERIC(3, 1),  -- sub-ratings (0–10)
  longevity_rating NUMERIC(3, 1),
  sillage_rating   NUMERIC(3, 1),
  bottle_rating    NUMERIC(3, 1),
  accords          TEXT[],         -- e.g. {Fresh,Citrus,Woody}
  perfumers        TEXT[],         -- e.g. {"Jacques Polge"}
  description      TEXT,
  in_production    BOOLEAN,
  rank_position    INT,            -- e.g. 11 = "Ranked 11 in Men's Perfume"
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fragrance_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragrance_id  UUID NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  note          TEXT NOT NULL,
  position      TEXT            -- 'top' | 'middle' | 'base' (null — Parfumo doesn't expose it)
);

-- Full-text search index on name + brand
CREATE INDEX IF NOT EXISTS fragrances_fts_idx
  ON fragrances USING GIN (to_tsvector('english', name || ' ' || brand));

-- Trigram index for fuzzy / partial matching
CREATE INDEX IF NOT EXISTS fragrances_trgm_name_idx  ON fragrances USING GIN (name  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS fragrances_trgm_brand_idx ON fragrances USING GIN (brand gin_trgm_ops);

-- Accord filtering ("show me fresh fragrances")
CREATE INDEX IF NOT EXISTS fragrances_accords_idx ON fragrances USING GIN (accords);
