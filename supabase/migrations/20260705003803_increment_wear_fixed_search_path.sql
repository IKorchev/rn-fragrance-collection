-- Pin search_path so the function can't be hijacked via schema shadowing
CREATE OR REPLACE FUNCTION increment_wear(row_id UUID) RETURNS void AS $$
  UPDATE user_fragrances
  SET times_worn = times_worn + 1, last_worn = now()
  WHERE id = row_id;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;
