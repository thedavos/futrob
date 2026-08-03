import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export type CompetitionEntryStatus = "pending" | "approved" | "rejected";

export interface CompetitionEntry {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly status: CompetitionEntryStatus;
  readonly createdAt: Date;
  readonly creationKey: string | null;
}
