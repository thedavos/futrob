import type { EncounterReaderPort } from "@/modules/results";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { FutrobClient } from "@futrob/sdk";

export class ProductApiEncounterReader implements EncounterReaderPort {
  constructor(private readonly client: FutrobClient) {}

  async getById(encounterId: EncounterId) {
    try {
      const snapshot = await this.client.encounters.getScheduleSnapshot(encounterId);
      return {
        encounterId: asEncounterId(snapshot.encounterId),
        organizationId: asOrganizationId(snapshot.organizationId),
        competitionId: asCompetitionId(snapshot.competitionId),
        homeTeamId: asTeamId(snapshot.homeTeamId),
        awayTeamId: asTeamId(snapshot.awayTeamId),
        scheduledStartAt: new Date(snapshot.scheduledStartAt),
        officialMatchCount: snapshot.officialMatchCount,
        homeExternalClubId: snapshot.homeExternalClubId,
        awayExternalClubId: snapshot.awayExternalClubId,
        providerKey: snapshot.providerKey,
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { readonly status?: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  }
}
