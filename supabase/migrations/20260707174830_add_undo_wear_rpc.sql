-- Reverses today's wear for a collection row (the toast-undo window after a
-- mistap): deletes today's wear_event, decrements times_worn, and restores
-- last_worn from the remaining linked events. Returns false when there is
-- nothing to undo today. SECURITY INVOKER — RLS scopes everything to the
-- caller's own rows. NOTE: for legacy rows whose earlier wears predate
-- wear_events linkage, last_worn may restore to NULL; acceptable (the picker
-- then treats the row as not recently worn).
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
