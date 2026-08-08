import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../entities/competition-entry.ts";

export interface CompetitionEntryRepository {
  findById(organizationId: OrganizationId, entryId: string): Promise<CompetitionEntry | null>;
  findByCompetitionAndTeam(
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<CompetitionEntry | null>;
  findByCreationKey(creationKey: string): Promise<CompetitionEntry | null>;
  listByCompetition?(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly CompetitionEntry[]>;
  save(entry: CompetitionEntry): Promise<CompetitionEntry>;
  remove?(organizationId: OrganizationId, entryId: string): Promise<boolean>;
}
