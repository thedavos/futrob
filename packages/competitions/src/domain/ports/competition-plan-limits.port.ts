import type { OrganizationId } from "@futrob/shared-kernel";
import type { CompetitionFormat } from "../entities/competition.ts";

/** What the organization's plan allows; `null` means unlimited (ADR-0025). */
export interface CompetitionPlanLimits {
  readonly maxActiveCompetitions: number | null;
  readonly maxTeamsPerCompetition: number | null;
  readonly allowedFormats: readonly CompetitionFormat[];
}

/** Implemented by the deployable from the organization's entitlements. */
export interface CompetitionPlanLimitsPort {
  limitsFor(organizationId: OrganizationId): Promise<CompetitionPlanLimits>;
}
