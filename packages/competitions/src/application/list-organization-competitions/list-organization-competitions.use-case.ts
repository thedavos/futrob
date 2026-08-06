import type { OrganizationId } from "@futrob/shared-kernel";
import type { Competition } from "../../domain/entities/competition.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";

export interface ListOrganizationCompetitionsInput {
  readonly organizationId: OrganizationId;
}

export class ListOrganizationCompetitionsUseCase {
  constructor(private readonly competitions: CompetitionRepository) {}

  execute(input: ListOrganizationCompetitionsInput): Promise<Competition[]> {
    return this.competitions.listByOrganization(input.organizationId);
  }
}
