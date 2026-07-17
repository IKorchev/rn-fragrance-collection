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
  -- Bottle metadata — in the live DB (and generated database.types.ts) but
  -- not surfaced anywhere in the app yet
  bottle_price   NUMERIC,
  bottle_size_ml INT,
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

-- User-suggested catalog additions (migration
-- add_fragrance_submissions_moderation). A manual add stays instant and
-- personal (user_fragrances, fragrance_id NULL); this table only queues the
-- suggestion for promotion into the shared fragrances catalog. Nothing here
-- is visible in search until a moderator approves — approval is what inserts
-- the catalog row.
CREATE TABLE IF NOT EXISTS fragrance_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Submitter's collection row, for FK backfill on approval. SET NULL keeps
  -- the submission reviewable if they delete the row meanwhile.
  user_fragrance_id    UUID REFERENCES user_fragrances(id) ON DELETE SET NULL,
  brand                TEXT NOT NULL CONSTRAINT fragrance_submissions_brand_length
                         CHECK (char_length(btrim(brand)) BETWEEN 1 AND 100),
  title                TEXT NOT NULL CONSTRAINT fragrance_submissions_title_length
                         CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  status               TEXT NOT NULL DEFAULT 'pending' CONSTRAINT fragrance_submissions_status_valid
                         CHECK (status IN ('pending', 'approved', 'merged', 'rejected')),
  -- Outcome: the catalog row created (approve) or linked (merge)
  decided_fragrance_id UUID REFERENCES fragrances(id),
  -- Triage: closest catalog match at submit time (pg_trgm), so the review
  -- query can surface likely duplicates first
  similar_fragrance_id UUID REFERENCES fragrances(id),
  similarity           REAL,
  moderator_note       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS fragrance_submissions_user_id_idx ON fragrance_submissions (user_id);
CREATE INDEX IF NOT EXISTS fragrance_submissions_pending_idx
  ON fragrance_submissions (created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS fragrance_submissions_user_fragrance_id_idx
  ON fragrance_submissions (user_fragrance_id) WHERE user_fragrance_id IS NOT NULL;
-- One pending suggestion per user per fragrance
CREATE UNIQUE INDEX IF NOT EXISTS fragrance_submissions_pending_unique
  ON fragrance_submissions (user_id, lower(btrim(brand)), lower(btrim(title)))
  WHERE status = 'pending';

ALTER TABLE fragrance_submissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own submissions (e.g. a future "pending review" badge).
-- No INSERT/UPDATE/DELETE policies: writes go through the RPCs below so the
-- rate cap and triage scoring can't be bypassed.
CREATE POLICY "own submissions" ON fragrance_submissions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Who may review submissions. Membership is managed manually (SQL editor):
--   INSERT INTO moderators (user_id) SELECT id FROM auth.users WHERE email = '...';
CREATE TABLE IF NOT EXISTS moderators (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

-- A user may check their own membership (drives showing a future in-app
-- moderation entry point). Enforcement lives in review_submission, not here.
CREATE POLICY "own membership" ON moderators FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- KNN support for the closest-match triage lookup: ORDER BY <-> can use a
-- GiST trgm index; fragrance-db's GIN trgm indexes only serve % / LIKE.
CREATE INDEX IF NOT EXISTS fragrances_brand_name_trgm_gist_idx
  ON fragrances USING gist ((brand || ' ' || name) gist_trgm_ops);

-- Queue a catalog suggestion. SECURITY DEFINER because clients have no INSERT
-- policy: this is the only write path, enforcing the pending cap, ownership of
-- the linked collection row, and the trigram triage score.
CREATE OR REPLACE FUNCTION submit_fragrance_suggestion(
  p_brand text, p_title text, p_user_fragrance_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_brand text := btrim(p_brand);
  v_title text := btrim(p_title);
  v_match record;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  -- coalesce: char_length(NULL) is NULL, which would slip past a bare < 1
  IF coalesce(char_length(v_brand), 0) < 1 OR coalesce(char_length(v_title), 0) < 1 THEN
    RAISE EXCEPTION 'brand and title are required';
  END IF;
  -- Serialize this user's submissions so concurrent calls can't race the
  -- pending cap (count-then-insert is not atomic on its own)
  PERFORM pg_advisory_xact_lock(hashtext('fragrance_submissions'), hashtext(v_uid::text));
  IF (SELECT count(*) FROM fragrance_submissions
      WHERE user_id = v_uid AND status = 'pending') >= 5 THEN
    RAISE EXCEPTION 'too many pending suggestions';
  END IF;
  IF p_user_fragrance_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_fragrances WHERE id = p_user_fragrance_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'collection row not found';
  END IF;

  -- Closest catalog match for triage. KNN over the GiST expression index —
  -- similarity() is only evaluated for the single row the index returns.
  SELECT f.id, similarity(f.brand || ' ' || f.name, v_brand || ' ' || v_title) AS sim
  INTO v_match
  FROM fragrances f
  ORDER BY (f.brand || ' ' || f.name) <-> (v_brand || ' ' || v_title)
  LIMIT 1;

  -- Same fragrance already pending from this user: idempotent, return the
  -- existing row. ON CONFLICT (arbitrated by fragrance_submissions_pending_unique)
  -- keeps this race-free without a separate SELECT.
  INSERT INTO fragrance_submissions
    (user_id, user_fragrance_id, brand, title, similar_fragrance_id, similarity)
  VALUES (v_uid, p_user_fragrance_id, v_brand, v_title, v_match.id, v_match.sim)
  ON CONFLICT (user_id, lower(btrim(brand)), lower(btrim(title))) WHERE status = 'pending'
  DO UPDATE SET user_fragrance_id =
    coalesce(fragrance_submissions.user_fragrance_id, EXCLUDED.user_fragrance_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Moderator decision, all effects in one transaction:
--   approve -> new fragrances row ('user:<submission-id>' as the source_url
--              dedup key), backfill the submitter's collection row + wear
--              events with the new FK
--   merge   -> same backfill, but onto an existing catalog row (duplicates)
--   reject  -> stamp status/note only; the submitter's personal row is
--              untouched and keeps working
-- Callable from the dashboard SQL editor or a future in-app moderation screen;
-- authorization is the moderators-table check, not UI visibility. Example:
--   SELECT review_submission('<submission-id>', 'approve');
--   SELECT review_submission('<submission-id>', 'merge', '<fragrance-id>');
--   SELECT review_submission('<submission-id>', 'reject', NULL, 'not a real fragrance');
CREATE OR REPLACE FUNCTION review_submission(
  p_submission_id uuid, p_action text,
  p_merge_target uuid DEFAULT NULL, p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  v_frag uuid;
  v_catalog_image text;
BEGIN
  -- auth.uid() is NULL when there is no JWT — i.e. the dashboard SQL editor
  -- (session_user postgres), which is trusted. PostgREST callers always carry
  -- a JWT and must be in moderators.
  IF NOT (
    (auth.uid() IS NULL AND session_user = 'postgres')
    OR EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;

  SELECT * INTO s FROM fragrance_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission not found';
  END IF;
  IF s.status <> 'pending' THEN
    RAISE EXCEPTION 'submission already reviewed (%)', s.status;
  END IF;

  IF p_action = 'approve' THEN
    INSERT INTO fragrances (brand, name, source_url)
    VALUES (btrim(s.brand), btrim(s.title), 'user:' || s.id)
    RETURNING id INTO v_frag;
  ELSIF p_action = 'merge' THEN
    IF p_merge_target IS NULL THEN
      RAISE EXCEPTION 'merge requires a target fragrance id';
    END IF;
    SELECT id INTO v_frag FROM fragrances WHERE id = p_merge_target;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'merge target not found';
    END IF;
  ELSIF p_action = 'reject' THEN
    v_frag := NULL;
  ELSE
    RAISE EXCEPTION 'unknown action % (use approve / merge / reject)', p_action;
  END IF;

  IF v_frag IS NOT NULL AND s.user_fragrance_id IS NOT NULL THEN
    SELECT image_url INTO v_catalog_image FROM fragrances WHERE id = v_frag;
    -- Link the submitter's row; on merge, adopt the catalog image if the
    -- manual add had none. Guard on fragrance_id IS NULL so a row the user
    -- re-linked meanwhile isn't clobbered.
    UPDATE user_fragrances
    SET fragrance_id = v_frag, image_url = COALESCE(image_url, v_catalog_image)
    WHERE id = s.user_fragrance_id AND fragrance_id IS NULL;
    UPDATE wear_events
    SET fragrance_id = v_frag
    WHERE user_fragrance_id = s.user_fragrance_id AND fragrance_id IS NULL;
  END IF;

  UPDATE fragrance_submissions
  SET status = CASE p_action WHEN 'approve' THEN 'approved'
                             WHEN 'merge' THEN 'merged'
                             ELSE 'rejected' END,
      decided_fragrance_id = v_frag,
      moderator_note = p_note,
      reviewed_at = now()
  WHERE id = p_submission_id;

  -- Best-effort push to the submitter via the notify-submission-decision edge
  -- function (same pg_net + Vault pattern as the wear-reminder cron job).
  -- Never fails the moderator's decision — Vault secrets missing, pg_net
  -- down, or the push itself failing are all swallowed here.
  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
             || '/functions/v1/notify-submission-decision',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
      ),
      body := jsonb_build_object('submission_id', p_submission_id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_frag;
END;
$$;

-- The manual-add path: one transaction inserts the personal collection row
-- and queues the catalog suggestion, so the pairing can't be half-lost
-- between two client calls (kill/offline after the first). The suggestion is
-- best-effort (subtransaction): a full pending queue never fails the add.
CREATE OR REPLACE FUNCTION add_manual_fragrance(p_brand text, p_title text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_brand text := btrim(p_brand);
  v_title text := btrim(p_title);
  v_row_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF coalesce(char_length(v_brand), 0) < 1 OR coalesce(char_length(v_title), 0) < 1 THEN
    RAISE EXCEPTION 'brand and title are required';
  END IF;
  -- SECURITY INVOKER: the insert runs under the caller's own-rows RLS policy
  INSERT INTO user_fragrances (user_id, name, image_url, fragrance_id, times_worn)
  VALUES (auth.uid(), v_brand || ' - ' || v_title, NULL, NULL, 0)
  RETURNING id INTO v_row_id;
  BEGIN
    PERFORM submit_fragrance_suggestion(v_brand, v_title, v_row_id);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- best-effort: never fail the personal add over the suggestion
  END;
  RETURN v_row_id;
END;
$$;

-- Moderation queue read for the in-app moderation screen. RLS only lets a
-- user see their own fragrance_submissions rows ("own submissions" policy),
-- so a moderator needs a SECURITY DEFINER path to list everyone's pending
-- rows — mirrors review_submission's moderator gate.
CREATE OR REPLACE FUNCTION list_pending_submissions(p_max_results integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  brand text,
  title text,
  created_at timestamptz,
  similarity real,
  similar_fragrance_id uuid,
  similar_brand text,
  similar_name text,
  similar_image_url text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM moderators WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not a moderator';
  END IF;

  RETURN QUERY
  SELECT fs.id, fs.brand, fs.title, fs.created_at, fs.similarity, fs.similar_fragrance_id,
         f.brand, f.name, f.image_url
  FROM fragrance_submissions fs
  LEFT JOIN fragrances f ON f.id = fs.similar_fragrance_id
  WHERE fs.status = 'pending'
  ORDER BY fs.created_at
  LIMIT p_max_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_fragrance_suggestion(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_fragrance_suggestion(text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_submission(uuid, text, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION add_manual_fragrance(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_manual_fragrance(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION list_pending_submissions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_pending_submissions(integer) TO authenticated;

-- Personal tags — organize/filter your own collection (picker filters,
-- collection tab, wear history). Stored directly on user_fragrances rather
-- than a separate tags table: already RLS-scoped via the "own rows" policy,
-- and the whole collection is loaded client-side anyway
-- (AuthContext.userCollection), so there's no server-side facet query to
-- optimize for. Normalized (lowercase/trimmed/deduped/capped) both here and
-- client-side (src/lib/utils/tags.ts) so the two stay in lockstep. Free
-- feature — organizing your own collection isn't a Pro upsell (see
-- src/lib/entitlements.ts for what is).
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

-- Not queried server-side today (filtering happens client-side over the
-- already-loaded collection) but cheap to keep ready for a future tag-search
-- RPC, and documents that `tags` is meant to be queried by containment.
CREATE INDEX IF NOT EXISTS user_fragrances_tags_gin_idx ON user_fragrances USING gin (tags);

-- Free-tier collection cap (server-side enforcement — this is exactly what
-- the `subscriptions` table's doc comment above flagged it for). Free
-- accounts top out at FREE_COLLECTION_LIMIT (src/lib/entitlements.ts, kept in
-- sync with the 40 below by convention, not a shared constant); Pro is
-- unlimited. RLS already restricts INSERTs on this table to the caller's own
-- user_id, so reading `subscriptions` for that same id needs no elevated
-- privileges — SECURITY INVOKER (the default).
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
