import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export interface CompetitionPlayoffSpotsReaderPort {
  /**
   * Teams the regular table sends to a playoffs stage. Null when the format has none, or once
   * an approved playoffs result makes the table more than the league ranking.
   */
  find(organizationId: OrganizationId, competitionId: CompetitionId): Promise<number | null>;
}
