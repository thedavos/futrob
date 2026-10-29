import type {
  CompetitionPlanLimits,
  CompetitionPlanLimitsPort,
} from "../domain/ports/competition-plan-limits.port.ts";

export const UNLIMITED_COMPETITION_PLAN: CompetitionPlanLimits = {
  maxActiveCompetitions: null,
  maxTeamsPerCompetition: null,
  allowedFormats: ["league", "knockout", "groups-knockout", "league-playoffs"],
};

/** Plan limits fixed for a test; defaults to unlimited so unrelated suites stay untouched. */
export function fixedPlanLimits(
  limits: Partial<CompetitionPlanLimits> = {},
): CompetitionPlanLimitsPort & { set(next: Partial<CompetitionPlanLimits>): void } {
  let current = { ...UNLIMITED_COMPETITION_PLAN, ...limits };
  return {
    limitsFor: async () => current,
    set(next) {
      current = { ...current, ...next };
    },
  };
}
