-- Catalog is publicly readable, writable only via direct DATABASE_URL
-- connections (table owner bypasses RLS — scraper/import/API unaffected).
ALTER TABLE fragrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragrance_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON fragrances FOR SELECT USING (true);
CREATE POLICY "public read" ON fragrance_notes FOR SELECT USING (true);
