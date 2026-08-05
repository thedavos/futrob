import type { CompetitionId } from "@futrob/shared-kernel";

export interface RosterCapacityPort {
  getMaxRosterSize(competitionId: CompetitionId): Promise<number>;
}
