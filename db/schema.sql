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
  -- Personal rating/notes — user-entered, so exempt from the
  -- no-scraped-metadata rule. rating is manual-add-only (fragrance_id IS
  -- NULL) — catalog-linked items rate through fragrance_ratings below, which
  -- also powers the cross-user community average.
  rating        SMALLINT CONSTRAINT user_fragrances_rating_range CHECK (rating BETWEEN 1 AND 5),
  notes         TEXT CONSTRAINT user_fragrances_notes_length CHECK (char_length(notes) <= 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cover both FKs so joins/cascades don't full-scan at scale.
CREATE INDEX IF NOT EXISTS user_fragrances_fragrance_id_idx ON user_fragrances (fragrance_id);
CREATE INDEX IF NOT EXISTS user_fragrances_user_id_idx ON user_fragrances (user_id);

ALTER TABLE user_fragrances ENABLE ROW LEVEL SECURITY;

-- The app only ever holds the public anon key — RLS is what keeps each user's
-- rows private (the Firestore-security-rules equivalent). auth.uid() is
-- wrapped in a subquery so Postgres evaluates it once per statement instead
-- of once per row (see the Postgres best-practices RLS guidance).
CREATE POLICY "own rows" ON user_fragrances FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Wear-event log — one immutable row per wear, powering the windowed
-- "most worn" leaderboard (times_worn/last_worn can't answer "this week").
-- name/image are denormalized so history survives collection-row deletion.
CREATE TABLE IF NOT EXISTS wear_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fragrance_id  UUID REFERENCES fragrances(id),  -- null for legacy/no-FK rows
  -- Originating collection row, so a wear can be undone precisely. SET NULL
  -- keeps leaderboard history alive when the collection row is deleted.
  user_fragrance_id UUID REFERENCES user_fragrances(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,                   -- "Brand - Title" snapshot
  image_url     TEXT,
  worn_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wear_events_worn_at_idx ON wear_events (worn_at);
CREATE INDEX IF NOT EXISTS wear_events_user_fragrance_id_idx
  ON wear_events (user_fragrance_id) WHERE user_fragrance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wear_events_fragrance_id_idx ON wear_events (fragrance_id);
CREATE INDEX IF NOT EXISTS wear_events_user_id_idx ON wear_events (user_id);

ALTER TABLE wear_events ENABLE ROW LEVEL SECURITY;

-- Users write/read only their own events; the cross-user leaderboard goes
-- through the SECURITY DEFINER aggregate below (no raw rows exposed).
CREATE POLICY "own events" ON wear_events FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Atomic wear increment (avoids read-modify-write races) + event log, capped
-- at one wear per calendar day. The app passes the device's IANA timezone so
-- "day" means the user's day, not UTC's (invalid tz falls back to UTC).
-- Returns whether the wear was counted (false -> already worn today).
-- SECURITY INVOKER: the UPDATE is RLS-scoped to the caller's rows, so the
-- INSERT inherits a legit user_id.
CREATE OR REPLACE FUNCTION increment_wear(row_id uuid, tz text DEFAULT 'UTC')
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  BEGIN
    PERFORM now() AT TIME ZONE tz;
  EXCEPTION WHEN OTHERS THEN
    tz := 'UTC';
  END;

  UPDATE user_fragrances u
  SET times_worn = u.times_worn + 1, last_worn = now()
  WHERE u.id = row_id
    AND (u.last_worn IS NULL
         OR (u.last_worn AT TIME ZONE tz)::date < (now() AT TIME ZONE tz)::date)
  RETURNING u.user_id, u.fragrance_id, u.name, u.image_url INTO r;

  IF NOT FOUND THEN
    RETURN false;  -- already worn today (or row not visible under RLS)
  END IF;

  INSERT INTO wear_events (user_id, fragrance_id, user_fragrance_id, name, image_url)
  VALUES (r.user_id, r.fragrance_id, row_id, r.name, r.image_url);
  RETURN true;
END;
$$;

-- Reverses today's wear (the toast-undo window after a mistap): deletes
-- today's wear_event, decrements times_worn, restores last_worn from the
-- remaining linked events. Returns false when there's nothing to undo today.
-- SECURITY INVOKER — RLS scopes everything to the caller's own rows.
-- NOTE: legacy rows whose earlier wears predate wear_events linkage may
-- restore last_worn to NULL (picker then treats them as not recently worn).
CREATE OR REPLACE FUNCTION undo_wear(row_id uuid, tz text DEFAULT 'UTC')
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  ev_id uuid;
  prev_worn timestamptz;
BEGIN
  BEGIN
    PERFORM now() AT TIME ZONE tz;
  EXCEPTION WHEN OTHERS THEN
    tz := 'UTC';
  END;

  SELECT id INTO ev_id
  FROM wear_events
  WHERE user_fragrance_id = row_id
    AND (worn_at AT TIME ZONE tz)::date = (now() AT TIME ZONE tz)::date
  ORDER BY worn_at DESC
  LIMIT 1;

  IF ev_id IS NULL THEN
    RETURN false;  -- no wear today (or row not visible under RLS)
  END IF;

  DELETE FROM wear_events WHERE id = ev_id;

  SELECT max(worn_at) INTO prev_worn
  FROM wear_events
  WHERE user_fragrance_id = row_id;

  UPDATE user_fragrances u
  SET times_worn = GREATEST(u.times_worn - 1, 0), last_worn = prev_worn
  WHERE u.id = row_id;

  RETURN true;
END;
$$;

-- Top-100 most worn across ALL users (the app's "Most Worn" tab). Every
-- period counts wear_events ('all' just uses an unbounded cutoff), so results
-- survive collection-row deletion. Groups by catalog FK when present, else
-- case-insensitive name.
CREATE OR REPLACE FUNCTION top_worn_fragrances(
  period text DEFAULT 'all', max_results int DEFAULT 100
)
RETURNS TABLE (place bigint, name text, image_url text, fragrance_id uuid, wear_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH cutoff AS (
    SELECT CASE period
      WHEN 'day'   THEN now() - interval '1 day'
      WHEN 'week'  THEN now() - interval '7 days'
      WHEN 'month' THEN now() - interval '30 days'
      WHEN 'year'  THEN now() - interval '365 days'
      ELSE '-infinity'::timestamptz
    END AS t
  ),
  counts AS (
    SELECT
      COALESCE(w.fragrance_id::text, LOWER(w.name)) AS grp,
      MAX(w.name) AS name,
      MAX(w.image_url) AS image_url,
      w.fragrance_id,
      COUNT(*)::bigint AS wear_count
    FROM wear_events w, cutoff c
    WHERE w.worn_at >= c.t
    GROUP BY 1, w.fragrance_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY wear_count DESC, name ASC) AS place,
         name, image_url, fragrance_id, wear_count
  FROM counts
  ORDER BY place
  LIMIT GREATEST(1, LEAST(max_results, 100))
$$;

-- The app only ever calls this signed-in; no reason to expose the
-- SECURITY DEFINER aggregate to anonymous clients. Postgres grants EXECUTE to
-- the PUBLIC pseudo-role by default, and every role (including anon)
-- implicitly has whatever PUBLIC has — REVOKE ... FROM anon alone does NOT
-- block it, so PUBLIC must be revoked too, with authenticated re-granted.
REVOKE EXECUTE ON FUNCTION top_worn_fragrances(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION top_worn_fragrances(text, int) TO authenticated;

-- Community fragrance ratings — decoupled from user_fragrances so a rating
-- survives collection-row deletion/duplication and isn't tied to ownership.
-- One rating per user per catalog fragrance. Mirrors the wear_events split:
-- own-rows RLS here, cross-user aggregation only via a SECURITY DEFINER RPC.
CREATE TABLE IF NOT EXISTS fragrance_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fragrance_id  UUID NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CONSTRAINT fragrance_ratings_rating_range CHECK (rating BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fragrance_id)
);

CREATE INDEX IF NOT EXISTS fragrance_ratings_fragrance_id_idx ON fragrance_ratings (fragrance_id);

ALTER TABLE fragrance_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ratings" ON fragrance_ratings FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Community average + count for a batch of catalog fragrance ids — batched so
-- a list screen makes one call for a whole page instead of N+1.
CREATE OR REPLACE FUNCTION get_fragrance_ratings(fragrance_ids uuid[])
RETURNS TABLE (fragrance_id uuid, avg_rating double precision, rating_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fr.fragrance_id, avg(fr.rating)::double precision, count(*)::bigint
  FROM fragrance_ratings fr
  WHERE fr.fragrance_id = ANY(fragrance_ids)
  GROUP BY fr.fragrance_id
$$;

REVOKE EXECUTE ON FUNCTION get_fragrance_ratings(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_fragrance_ratings(uuid[]) TO authenticated;

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
  -- Per-device wear-reminder opt-out (profile toggle); send-wear-reminder
  -- only pushes to tokens where this is true.
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx ON user_push_tokens (user_id);

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

-- NOTE: the scraped read-only top_fragrances table (Firestore lift-and-shift)
-- was dropped by migration drop_scraped_metadata_add_wear_leaderboard — the
-- Add tab's leaderboard is now the community top_worn_fragrances() above.

-- Pro-tier entitlement state, synced from RevenueCat via a webhook
-- (supabase/functions/revenuecat-webhook). RevenueCat's SDK is the
-- client-side source of truth for UI gating (CustomerInfo cache); this
-- table exists for server-side enforcement (e.g. a free-tier collection
-- cap) and admin visibility from SQL. Only the service role writes to it —
-- there's no INSERT/UPDATE policy for `authenticated`, read-only.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pro       BOOLEAN NOT NULL DEFAULT false,
  entitlement  TEXT,
  expires_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subscription" ON subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Set once via the Supabase CLI (dashboard secrets aren't in this file):
--   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random value>
-- then paste the same value as "Authorization: Bearer <value>" in
-- RevenueCat's dashboard (Project settings -> Integrations -> Webhooks),
-- pointed at this project's revenuecat-webhook function URL.
