import type { Competition } from "../domain/entities/competition.ts";
import {
  CompetitionCapacityReached,
  CompetitionPlanLimitReached,
} from "../domain/errors/competition.errors.ts";
import type { CompetitionPlanLimitsPort } from "../domain/ports/competition-plan-limits.port.ts";
import { hasCapacityFor } from "../domain/value-objects/team-range.ts";

/**
 * Why one more approved team does not fit: the competition's own cap first, then the
 * plan's. A downgrade never removes teams; it only stops new approvals.
 */
export async function approvedTeamCapacityError(
  planLimits: CompetitionPlanLimitsPort,
  competition: Competition,
  approved: number,
): Promise<CompetitionCapacityReached | CompetitionPlanLimitReached | null> {
  if (!hasCapacityFor(competition.teams, approved)) {
    return new CompetitionCapacityReached({
      code: "competitions.capacity_reached",
      message: "Competition has reached its team capacity",
    });
  }
  const { maxTeamsPerCompetition } = await planLimits.limitsFor(competition.organizationId);
  if (maxTeamsPerCompetition === null || approved < maxTeamsPerCompetition) return null;
  return new CompetitionPlanLimitReached({
    code: "competitions.plan_limit_reached",
    message: `The organization's plan allows ${maxTeamsPerCompetition} teams per competition`,
    limit: "teams_per_competition",
    max: maxTeamsPerCompetition,
  });
}
