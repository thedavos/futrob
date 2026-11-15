import { activePointDeductions, type CompetitionSanctionRepository } from "@futrob/competitions";
import type {
  CompetitionPointDeduction,
  CompetitionPointDeductionReaderPort,
} from "@futrob/statistics";
import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";

/** Feeds the table the active point deductions of competition sanctions (ADR-0028). */
export class SanctionPointDeductionReader implements CompetitionPointDeductionReaderPort {
  constructor(
    private readonly sanctions: Pick<CompetitionSanctionRepository, "listByCompetition">,
  ) {}

  async listActive(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly CompetitionPointDeduction[]> {
    return activePointDeductions(
      await this.sanctions.listByCompetition(organizationId, competitionId),
    );
  }
}
