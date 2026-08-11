import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { PlayerAggregateStats } from "./player-aggregate-stats.ts";

export interface PlayerCompetitionStats extends PlayerAggregateStats {
  readonly playerProfileId: string;
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly updatedAt: Date;
}
