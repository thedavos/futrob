ALTER TABLE player_game_accounts
  ADD COLUMN IF NOT EXISTS provider_external_player_id TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS player_game_accounts_provider_external_unique
  ON player_game_accounts (provider_external_player_id, platform, game_edition)
  WHERE provider_external_player_id IS NOT NULL;
