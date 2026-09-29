-- Competitions gain an explicit registration phase between draft and published.
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_status_check;
ALTER TABLE competitions
  ADD CONSTRAINT competitions_status_check
  CHECK (status IN ('draft', 'registration', 'published', 'paused', 'finished', 'archived'));
