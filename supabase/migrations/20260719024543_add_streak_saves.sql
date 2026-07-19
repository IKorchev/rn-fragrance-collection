-- Streak Saver (Pro perk): lets a Pro user "spend a save" on a missed day so
-- computeStreak (src/lib/gamification/index.ts) treats it as worn via its
-- `freezeDates` option, without a real wear_events row. Capped at 2 saves
-- per calendar month (of the saved date) and only within the last 3 days,
-- all enforced server-side by use_streak_save below — this table alone has
-- no INSERT/UPDATE/DELETE policy for authenticated (own-rows SELECT only),
-- same pattern as wear_events/fragrance_submissions.
CREATE TABLE IF NOT EXISTS streak_saves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_date  DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, saved_date)
);

CREATE INDEX IF NOT EXISTS streak_saves_user_id_idx ON streak_saves (user_id);

ALTER TABLE streak_saves ENABLE ROW LEVEL SECURITY;

-- Users read their own saves (client mirrors the monthly budget + supplies
-- freezeDates to computeStreak — see src/lib/queries.ts's useStreakSaves).
CREATE POLICY "own streak saves" ON streak_saves FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- No INSERT/UPDATE/DELETE policy: writes go through use_streak_save below so
-- the Pro check, date window, and monthly cap can't be bypassed by a direct
-- PostgREST insert (same reasoning as wear_events' REVOKE).
REVOKE INSERT, UPDATE, DELETE ON TABLE streak_saves FROM PUBLIC, anon, authenticated;

-- Spends one of the caller's (Pro-only) monthly streak saves on
-- p_saved_date. Validates: caller is signed in and Pro (subscriptions.is_pro
-- — see add_subscriptions_table), the date is within the last 3 days and not
-- in the future, and fewer than 2 saves have already been used in that
-- date's calendar month. Returns true on success; false if that exact date
-- was already saved (idempotent re-call, e.g. a retried client request —
-- mirrors submit_fragrance_report's ON CONFLICT idempotency); raises a typed
-- message otherwise (matched verbatim by the client — see
-- STREAK_SAVER_*_ERROR in src/lib/entitlements.ts — same convention as
-- free_tier_collection_limit) so the client can tell "not Pro" apart from
-- "already used this month" apart from a generic failure.
CREATE OR REPLACE FUNCTION use_streak_save(p_saved_date date)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  pro boolean;
  used_this_month int;
  v_row_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  SELECT s.is_pro INTO pro FROM subscriptions s WHERE s.user_id = v_uid;
  IF NOT coalesce(pro, false) THEN
    RAISE EXCEPTION 'streak_saver_requires_pro';
  END IF;

  IF p_saved_date > CURRENT_DATE OR p_saved_date < CURRENT_DATE - 3 THEN
    RAISE EXCEPTION 'streak_saver_date_out_of_range';
  END IF;

  -- Serialize per-user so two concurrent calls can't both pass the monthly
  -- cap check (same pattern as enforce_free_tier_collection_cap).
  PERFORM pg_advisory_xact_lock(hashtext('streak_saves'), hashtext(v_uid::text));

  SELECT count(*) INTO used_this_month
  FROM streak_saves
  WHERE user_id = v_uid
    AND date_trunc('month', saved_date) = date_trunc('month', p_saved_date);

  IF used_this_month >= 2 THEN
    RAISE EXCEPTION 'streak_saver_monthly_limit';
  END IF;

  INSERT INTO streak_saves (user_id, saved_date)
  VALUES (v_uid, p_saved_date)
  ON CONFLICT (user_id, saved_date) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION use_streak_save(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION use_streak_save(date) TO authenticated;
