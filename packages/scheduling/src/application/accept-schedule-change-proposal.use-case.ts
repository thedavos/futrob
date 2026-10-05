import { err, type Result } from "@futrob/shared-kernel";
import type { ScheduleChangeResponder } from "../domain/entities/schedule-change-decision.ts";
import { consentToScheduleChange } from "../domain/entities/schedule-change-request.ts";
import type { ScheduleChangeResponseError } from "../domain/errors/schedule-change-request.errors.ts";
import { requiredScheduleChangeAuthorities } from "../domain/policies/schedule-change-approval.ts";
import {
  runScheduleChangeCommand,
  type ScheduleChangeCommandDeps,
  type ScheduleChangeCommandInput,
  type ScheduleChangeCommandOutput,
} from "./schedule-change-command.ts";

export interface AcceptScheduleChangeProposalInput extends ScheduleChangeCommandInput {
  readonly responder: ScheduleChangeResponder;
}

/**
 * Records the responder's consent to the current proposal. The request becomes
 * `accepted` only when every authority required by the competition consented to
 * that same proposal. Applying the new schedule is a separate step (#122).
 */
export class AcceptScheduleChangeProposalUseCase {
  constructor(private readonly deps: ScheduleChangeCommandDeps) {}

  execute(
    input: AcceptScheduleChangeProposalInput,
  ): Promise<Result<ScheduleChangeCommandOutput, ScheduleChangeResponseError>> {
    return runScheduleChangeCommand<ScheduleChangeResponseError>(this.deps, {
      input,
      type: "accept",
      responder: input.responder,
      payload: {},
      movesSchedule: true,
      decide: async ({ request, rules, now }) => {
        const required = requiredScheduleChangeAuthorities(rules);
        if (required.isErr()) return err(required.error);
        return consentToScheduleChange(request, {
          target: input,
          decisionId: this.deps.ids.generate(),
          responder: input.responder,
          actorId: input.actorId,
          requiredAuthorities: required.value,
          reason: null,
          now,
        });
      },
    });
  }
}
