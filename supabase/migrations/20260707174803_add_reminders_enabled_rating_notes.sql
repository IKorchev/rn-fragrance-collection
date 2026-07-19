-- Per-device wear-reminder opt-out (profile toggle). The send-wear-reminder
-- edge function only pushes to tokens with reminders_enabled = true.
ALTER TABLE user_push_tokens
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT true;

-- Personal rating/notes on collection rows — user-entered data, so it doesn't
-- violate the no-scraped-metadata rule.
ALTER TABLE user_fragrances
  ADD COLUMN IF NOT EXISTS rating SMALLINT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE user_fragrances
  ADD CONSTRAINT user_fragrances_rating_range CHECK (rating BETWEEN 1 AND 5),
  ADD CONSTRAINT user_fragrances_notes_length CHECK (char_length(notes) <= 2000);
