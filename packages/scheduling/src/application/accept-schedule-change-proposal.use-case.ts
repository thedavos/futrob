import { checkRescheduleMinimumNotice } from "../domain/policies/reschedule-minimum-notice.ts";
import { err, ok, type EventPublisherPort, type Result } from "@futrob/shared-kernel";
import type { ScheduleChangeResponder } from "../domain/entities/schedule-change-decision.ts";
import {
  currentScheduleChangeProposal,
  consentToScheduleChange,
} from "../domain/entities/schedule-change-request.ts";
import {
  InvalidScheduleChangeDate,
  type AcceptScheduleChangeProposalError,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { CompetitionRescheduleRulesPort } from "../domain/ports/competition-reschedule-rules.port.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { FixturePlanRepository } from "../domain/ports/fixture-plan.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { requiredScheduleChangeAuthorities } from "../domain/policies/schedule-change-approval.ts";
import {
  runScheduleChangeCommand,
  type ScheduleChangeCommandDeps,
  type ScheduleChangeCommandInput,
  type ScheduleChangeCommandOutput,
} from "./schedule-change-command.ts";
import { applyScheduleChange, prepareScheduleChangeApplication } from "./apply-schedule-change.ts";

export interface AcceptScheduleChangeProposalInput extends ScheduleChangeCommandInput {
  readonly responder: ScheduleChangeResponder;
}

export interface AcceptScheduleChangeProposalDeps extends ScheduleChangeCommandDeps {
  readonly encounters: Pick<EncounterScheduleRepository, "findById" | "upsert">;
  readonly eventPublisher: EventPublisherPort;
  readonly fixtures: Pick<FixturePlanRepository, "listActive" | "updateEncounter">;
  readonly matches: Pick<OfficialMatchRepository, "listByEncounter" | "saveSchedules">;
  readonly rules: Pick<CompetitionRescheduleRulesPort, "getRules" | "countAppliedReschedules">;
}

/**
 * Records the responder's consent to the current proposal. The consent that completes
 * every approval the competition requires also applies the proposal: slot starts,
 * Encounter start, fixture, request status, consumed quota and the application record
 * commit together or not at all.
 */
export class AcceptScheduleChangeProposalUseCase {
  constructor(private readonly deps: AcceptScheduleChangeProposalDeps) {}

  execute(
    input: AcceptScheduleChangeProposalInput,
  ): Promise<Result<ScheduleChangeCommandOutput, AcceptScheduleChangeProposalError>> {
    return runScheduleChangeCommand<AcceptScheduleChangeProposalError>(this.deps, {
      input,
      type: "accept",
      responder: input.responder,
      payload: {},
      movesSchedule: true,
      decide: async (context) => {
        const required = requiredScheduleChangeAuthorities(context.rules);
        if (required.isErr()) return err(required.error);
        const consent = consentToScheduleChange(context.request, {
          target: input,
          decisionId: this.deps.ids.generate(),
          responder: input.responder,
          actorId: input.actorId,
          requiredAuthorities: required.value,
          reason: null,
          now: context.now,
        });
        if (consent.isErr()) return err(consent.error);
        const proposal = currentScheduleChangeProposal(context.request);
        if (proposal.proposedStartAt.getTime() <= context.now.getTime()) {
          return err(
            new InvalidScheduleChangeDate({
              code: "scheduling.invalid_schedule_change_date",
              message: "The accepted start is no longer in the future",
            }),
          );
        }

        const notice = checkRescheduleMinimumNotice({
          scope: context.request.scope,
          schedules: context.schedules,
          proposedStartAt: proposal.proposedStartAt,
          minimumNoticeHours: context.rules.minimumNoticeHours,
          now: context.now,
        });
        if (notice.isErr()) return err(notice.error);

        if (consent.value.request.status !== "accepted") return ok(consent.value);
        return prepareScheduleChangeApplication(this.deps, context, consent.value, input.actorId);
      },
      afterCommit: (context, transition) =>
        applyScheduleChange(this.deps, context, transition, input.actorId),
    });
  }
}
