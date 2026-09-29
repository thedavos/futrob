-- Organizer-declared team capacity (approved entries) and planned start date.
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS max_teams INTEGER NULL
    CHECK (max_teams IS NULL OR max_teams BETWEEN 2 AND 256),
  ADD COLUMN IF NOT EXISTS starts_on DATE NULL;
