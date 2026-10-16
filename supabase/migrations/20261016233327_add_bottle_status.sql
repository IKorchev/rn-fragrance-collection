-- What the user actually owns of each collection row (full bottle, decant or
-- sample) and whether it's running low. User-entered on the detail sheet.
ALTER TABLE user_fragrances
  ADD COLUMN IF NOT EXISTS bottle_type TEXT
    CONSTRAINT user_fragrances_bottle_type_check CHECK (bottle_type IN ('full', 'decant', 'sample')),
  ADD COLUMN IF NOT EXISTS running_low BOOLEAN NOT NULL DEFAULT false;
