ALTER TABLE player_external_club_associations
  DROP CONSTRAINT IF EXISTS player_external_club_associations_pkey;

ALTER TABLE player_external_club_associations
  ADD CONSTRAINT player_external_club_associations_pkey
  PRIMARY KEY (player_profile_id, provider_key, external_club_id);
