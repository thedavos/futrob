import type { PlayerExternalClubAssociation } from "../entities/player-external-club-association.ts";

export interface PlayerExternalClubAssociationRepository {
  listByPlayerProfile(playerProfileId: string): Promise<readonly PlayerExternalClubAssociation[]>;
  upsertForPlayerProfile(
    association: PlayerExternalClubAssociation,
  ): Promise<PlayerExternalClubAssociation>;
}
