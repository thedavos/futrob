import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { PlayerAggregateStats } from "./player-aggregate-stats.ts";

export interface TeamCompetitionStats extends PlayerAggregateStats {
  readonly teamId: TeamId;
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly updatedAt: Date;
}
