import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export interface CompetitionTimeZonePort {
  getTimeZone(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<string | null>;
}
