import type { TeamId } from "@futrob/shared-kernel";
import type { PublicCompetitionScope } from "./published-competition-reader.port.ts";

export interface PublicTeamDirectoryPort {
  /** Display names of teams taking part in the competition. Unknown ids are absent. */
  namesByIds(
    scope: PublicCompetitionScope,
    teamIds: readonly TeamId[],
  ): Promise<ReadonlyMap<TeamId, string>>;
}
