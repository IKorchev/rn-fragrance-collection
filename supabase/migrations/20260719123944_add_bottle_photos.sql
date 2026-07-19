-- Per-bottle custom photos: one user-owned photo per collection row, stored
-- in a private bucket. The column just holds the storage object path — reads
-- go through short-lived signed URLs (see useBottlePhotoUrls), never a public
-- URL, since a user's own bottle photo must never be visible to anyone else.
ALTER TABLE user_fragrances ADD COLUMN IF NOT EXISTS custom_image_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bottle-photos', 'bottle-photos', false, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Objects are keyed "<user_id>/<row_id>-<timestamp>.jpg" — folder-scoped RLS
-- (storage.foldername(name))[1] is the owning user's id, mirroring the
-- user_fragrances "own rows" policy above. No update policy: every new photo
-- uploads to a fresh timestamped path instead of overwriting in place.
CREATE POLICY "own bottle photos select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bottle-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "own bottle photos insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bottle-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "own bottle photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bottle-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
