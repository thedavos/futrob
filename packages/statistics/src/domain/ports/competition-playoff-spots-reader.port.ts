import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export interface CompetitionPlayoffSpotsReaderPort {
  /** Teams the regular table sends to a playoffs stage, or null when the format has none. */
  find(organizationId: OrganizationId, competitionId: CompetitionId): Promise<number | null>;
}
