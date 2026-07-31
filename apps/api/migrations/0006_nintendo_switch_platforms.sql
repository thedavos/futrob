ALTER TABLE player_game_accounts
  DROP CONSTRAINT IF EXISTS player_game_accounts_platform_check;

ALTER TABLE player_game_accounts
  ADD CONSTRAINT player_game_accounts_platform_check CHECK (
    platform IN (
      'playstation',
      'xbox',
      'pc',
      'nintendo-switch-1',
      'nintendo-switch-2'
    )
  );
