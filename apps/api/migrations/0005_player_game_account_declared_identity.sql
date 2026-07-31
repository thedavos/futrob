-- Player game identifiers are declared by the actor and become usable immediately.
-- Futrob does not verify ownership of an EA identifier.
ALTER TABLE player_game_accounts
  DROP COLUMN IF EXISTS status;
