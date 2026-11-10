import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

/** Points a Team loses by an active sanction (ADR-0028). Several rows per Team add up. */
export interface CompetitionPointDeduction {
  readonly teamId: TeamId;
  readonly points: number;
}

/**
 * Active point deductions of a competition. Sanctions belong to `competitions`; `apps/api`
 * implements this port so the table is always official results plus deductions.
 */
export interface CompetitionPointDeductionReaderPort {
  listActive(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly CompetitionPointDeduction[]>;
}
