ALTER TABLE competition_rules
  ADD COLUMN IF NOT EXISTS ranking_minimum_matches INTEGER,
  ADD COLUMN IF NOT EXISTS ranking_minimum_team_minutes_ratio DOUBLE PRECISION;

ALTER TABLE competition_rules
  DROP CONSTRAINT IF EXISTS competition_rules_ranking_eligibility_check;
ALTER TABLE competition_rules
  ADD CONSTRAINT competition_rules_ranking_eligibility_check CHECK (
    (ranking_minimum_matches IS NULL AND ranking_minimum_team_minutes_ratio IS NULL)
    OR (
      ranking_minimum_matches >= 0
      AND ranking_minimum_team_minutes_ratio >= 0
      AND ranking_minimum_team_minutes_ratio <= 1
    )
  );
