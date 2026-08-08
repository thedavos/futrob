import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";

export class ListCompetitionParticipantsUseCase {
  constructor(private readonly entries: CompetitionEntryRepository) {}
  execute(input: { organizationId: OrganizationId; competitionId: CompetitionId }) {
    return (
      this.entries.listByCompetition?.(input.organizationId, input.competitionId) ??
      Promise.resolve([])
    );
  }
}
