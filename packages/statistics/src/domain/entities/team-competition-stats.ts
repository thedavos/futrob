import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { TeamAggregateStats } from "./team-aggregate-stats.ts";

export interface TeamCompetitionStats extends TeamAggregateStats {
  readonly teamId: TeamId;
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly updatedAt: Date;
}
