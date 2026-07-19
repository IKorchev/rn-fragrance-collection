-- Link wear events back to the collection row that produced them so a wear
-- can be undone precisely. SET NULL keeps leaderboard history alive when the
-- collection row is deleted (same reason name/image are denormalized).
ALTER TABLE wear_events
  ADD COLUMN IF NOT EXISTS user_fragrance_id UUID REFERENCES user_fragrances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wear_events_user_fragrance_id_idx
  ON wear_events (user_fragrance_id) WHERE user_fragrance_id IS NOT NULL;

-- increment_wear now stamps the originating collection row on the event.
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
