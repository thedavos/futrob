import type { PlayerExternalClubAssociation } from "../entities/player-external-club-association.ts";

export interface PlayerExternalClubAssociationRepository {
  findByPlayerProfile(playerProfileId: string): Promise<PlayerExternalClubAssociation | null>;
  upsertForPlayerProfile(
    association: PlayerExternalClubAssociation,
  ): Promise<PlayerExternalClubAssociation>;
}
