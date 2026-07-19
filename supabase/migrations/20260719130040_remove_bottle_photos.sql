-- Rolls back add_bottle_photos: the per-bottle photo feature was cut before
-- any client shipped, so the column and bucket were never written to.
-- The empty 'bottle-photos' bucket row itself can't be removed here —
-- storage.protect_delete() blocks SQL deletes on storage tables — so it was
-- deleted via the dashboard (Storage API) instead; with the policies below
-- dropped it was unreachable anyway.
DROP POLICY IF EXISTS "own bottle photos select" ON storage.objects;
DROP POLICY IF EXISTS "own bottle photos insert" ON storage.objects;
DROP POLICY IF EXISTS "own bottle photos delete" ON storage.objects;

ALTER TABLE user_fragrances DROP COLUMN IF EXISTS custom_image_path;
