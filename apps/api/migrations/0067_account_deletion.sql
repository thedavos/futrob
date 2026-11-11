-- Account deletion by anonymization (ADR-0029). The actors row stays as a tombstone because
-- official results and audit reference it with ON DELETE RESTRICT.

ALTER TABLE actors
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE actors
  ADD CONSTRAINT actors_deletion_schedule_complete CHECK (
    (deletion_requested_at IS NULL) = (deletion_scheduled_for IS NULL)
  ),
  ADD CONSTRAINT actors_deletion_after_request CHECK (
    deletion_scheduled_for IS NULL OR deletion_scheduled_for >= deletion_requested_at
  ),
  ADD CONSTRAINT actors_deleted_was_scheduled CHECK (
    deleted_at IS NULL OR deletion_scheduled_for IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS actors_deletion_due_index
  ON actors (deletion_scheduled_for)
  WHERE deletion_scheduled_for IS NOT NULL AND deleted_at IS NULL;

-- Deleting a player's game accounts must not collide with statistics already projected from
-- official results: the contribution keeps the provider data and loses the account link.
ALTER TABLE player_match_contributions
  DROP CONSTRAINT IF EXISTS player_match_contributions_game_account_id_fkey,
  ADD CONSTRAINT player_match_contributions_game_account_id_fkey
    FOREIGN KEY (game_account_id) REFERENCES player_game_accounts (id) ON DELETE SET NULL;
