import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ScheduleChangeAuthority } from "../entities/schedule-change-decision.ts";
import { ScheduleChangeApprovalNotConfigured } from "../errors/schedule-change-request.errors.ts";
import type { CompetitionRescheduleRules } from "../ports/competition-reschedule-rules.port.ts";

/**
 * Authorities whose consent a proposal needs. The proposing Team consents by
 * proposing, so "opponent" is always the other Team of the current proposal.
 * A stage that requires neither approval has no defined acceptance path yet.
 */
export function requiredScheduleChangeAuthorities(
  rules: Pick<CompetitionRescheduleRules, "requiresOpponentApproval" | "requiresOrganizerApproval">,
): Result<readonly ScheduleChangeAuthority[], ScheduleChangeApprovalNotConfigured> {
  const required: ScheduleChangeAuthority[] = [];
  if (rules.requiresOpponentApproval) required.push("rival_team");
  if (rules.requiresOrganizerApproval) required.push("organizer");
  if (required.length === 0) {
    return err(
      new ScheduleChangeApprovalNotConfigured({
        code: "scheduling.schedule_change_approval_not_configured",
        message: "The competition requires neither opponent nor organizer approval",
      }),
    );
  }
  return ok(required);
}
