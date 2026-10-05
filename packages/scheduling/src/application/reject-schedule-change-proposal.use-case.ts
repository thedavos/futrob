import { err, type Result } from "@futrob/shared-kernel";
import type { ScheduleChangeResponder } from "../domain/entities/schedule-change-decision.ts";
import { rejectScheduleChange } from "../domain/entities/schedule-change-request.ts";
import type { ScheduleChangeResponseError } from "../domain/errors/schedule-change-request.errors.ts";
import { requiredScheduleChangeAuthorities } from "../domain/policies/schedule-change-approval.ts";
import {
  runScheduleChangeCommand,
  type ScheduleChangeCommandDeps,
  type ScheduleChangeCommandInput,
  type ScheduleChangeCommandOutput,
} from "./schedule-change-command.ts";

export interface RejectScheduleChangeProposalInput extends ScheduleChangeCommandInput {
  readonly responder: ScheduleChangeResponder;
  readonly reason?: string;
}

/** A required authority closes the request as `rejected`; no schedule changes. */
export class RejectScheduleChangeProposalUseCase {
  constructor(private readonly deps: ScheduleChangeCommandDeps) {}

  execute(
    input: RejectScheduleChangeProposalInput,
  ): Promise<Result<ScheduleChangeCommandOutput, ScheduleChangeResponseError>> {
    const reason = input.reason?.trim() || null;
    return runScheduleChangeCommand<ScheduleChangeResponseError>(this.deps, {
      input,
      type: "reject",
      responder: input.responder,
      payload: { reason },
      movesSchedule: false,
      decide: async ({ request, rules, now }) => {
        const required = requiredScheduleChangeAuthorities(rules);
        if (required.isErr()) return err(required.error);
        return rejectScheduleChange(request, {
          target: input,
          decisionId: this.deps.ids.generate(),
          responder: input.responder,
          actorId: input.actorId,
          requiredAuthorities: required.value,
          reason,
          now,
        });
      },
    });
  }
}
