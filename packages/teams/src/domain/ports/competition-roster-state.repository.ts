import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { CompetitionRosterState } from "../entities/competition-roster-state.ts";

export interface CompetitionRosterStateRepository {
  get(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<CompetitionRosterState | null>;
  save(state: CompetitionRosterState): Promise<CompetitionRosterState>;
}
