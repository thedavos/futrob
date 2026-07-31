import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";

export class GetCompetitionDraftUseCase {
  constructor(private readonly competitions: CompetitionRepository) {}

  execute(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<CompetitionDraft | null> {
    return this.competitions.findById(input.organizationId, input.competitionId);
  }
}
