-- Uncapped per-scent aggregate of the caller's own wear_events, replacing the
-- 500-row useWearHistory list as the input for badges/streaks and the wear
-- diary's header stats + facets. SECURITY INVOKER: the "own events" RLS
-- policy scopes it, the explicit user_id filter just keeps the plan on
-- wear_events_user_id_idx. One row per (user_fragrance_id, name):
--   dusted_off — some wear of this name came >= 30 days after the previous
--     wear of the same name (lag partitioned by name, so a deleted-then-re-
--     added fragrance still counts across both rows)
--   worn_days  — distinct calendar days in p_tz (device timezone; invalid
--     input falls back to UTC, same as increment_wear)
CREATE OR REPLACE FUNCTION wear_summary(p_tz text DEFAULT 'UTC')
RETURNS TABLE (
  user_fragrance_id uuid,
  name text,
  wears bigint,
  recent_wears bigint,
  dusted_off boolean,
  worn_days date[]
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM now() AT TIME ZONE p_tz;
  EXCEPTION WHEN OTHERS THEN
    p_tz := 'UTC';
  END;

  RETURN QUERY
  WITH ev AS (
    SELECT e.user_fragrance_id, e.name, e.worn_at,
           e.worn_at - lag(e.worn_at) OVER (PARTITION BY e.name ORDER BY e.worn_at) AS gap
    FROM wear_events e
    WHERE e.user_id = (SELECT auth.uid())
  )
  SELECT ev.user_fragrance_id,
         ev.name,
         count(*),
         count(*) FILTER (WHERE ev.worn_at > now() - interval '7 days'),
         coalesce(bool_or(ev.gap >= interval '30 days'), false),
         array_agg(DISTINCT (ev.worn_at AT TIME ZONE p_tz)::date)
  FROM ev
  GROUP BY ev.user_fragrance_id, ev.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION wear_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wear_summary(text) TO authenticated;
