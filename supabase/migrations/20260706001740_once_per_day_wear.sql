-- A fragrance can only be worn once per calendar day. The app passes the
-- device's IANA timezone so "day" means the user's day, not UTC's; invalid
-- tz input falls back to UTC. Returns whether the wear was counted so the
-- app can tell "worn" apart from "already worn today".
-- (Return type + signature change, so drop the old (uuid) void version.)
DROP FUNCTION IF EXISTS increment_wear(uuid);

CREATE FUNCTION increment_wear(row_id uuid, tz text DEFAULT 'UTC')
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

  INSERT INTO wear_events (user_id, fragrance_id, name, image_url)
  VALUES (r.user_id, r.fragrance_id, r.name, r.image_url);
  RETURN true;
END;
$$;
