import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";

export class GetTeamEntryUseCase {
  constructor(private readonly entries: CompetitionEntryRepository) {}

  async execute(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly teamId: TeamId;
  }): Promise<CompetitionEntry | null> {
    const entry = await this.entries.findByCompetitionAndTeam(
      input.organizationId,
      input.competitionId,
      input.teamId,
    );
    return entry?.organizationId === input.organizationId ? entry : null;
  }
}
