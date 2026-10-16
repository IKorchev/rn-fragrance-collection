-- "Want to try" list: catalog fragrances the user hasn't bought yet. Catalog
-- only (fragrance_id NOT NULL); name/image are read through the fragrances
-- embed rather than snapshotted, since a wishlist row has no history to
-- preserve. Own rows only.
CREATE TABLE IF NOT EXISTS wishlist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fragrance_id  UUID NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_items_user_fragrance_unique UNIQUE (user_id, fragrance_id)
);

CREATE INDEX IF NOT EXISTS wishlist_items_fragrance_id_idx ON wishlist_items (fragrance_id);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wishlist" ON wishlist_items FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON wishlist_items FROM anon;
