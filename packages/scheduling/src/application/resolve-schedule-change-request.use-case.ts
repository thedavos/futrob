import { err, ok, type Result } from "@futrob/shared-kernel";
import type {
  ScheduleChangeAction,
  ScheduleChangeResolution,
} from "../domain/entities/schedule-change-action.ts";
import {
  currentScheduleChangeProposal,
  type ScheduleChangeTransition,
} from "../domain/entities/schedule-change-request.ts";
import {
  InvalidScheduleChangeResolution,
  type ResolveScheduleChangeRequestError,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { AcceptScheduleChangeProposalDeps } from "./accept-schedule-change-proposal.use-case.ts";
import { applyScheduleChange, prepareScheduleChangeApplication } from "./apply-schedule-change.ts";
import {
  runScheduleChangeCommand,
  type ScheduleChangeCommandInput,
  type ScheduleChangeCommandOutput,
} from "./schedule-change-command.ts";

export interface ResolveScheduleChangeRequestInput extends ScheduleChangeCommandInput {
  readonly resolution: ScheduleChangeResolution;
}

export class ResolveScheduleChangeRequestUseCase {
  constructor(private readonly deps: AcceptScheduleChangeProposalDeps) {}

  execute(
    input: ResolveScheduleChangeRequestInput,
  ): Promise<Result<ScheduleChangeCommandOutput, ResolveScheduleChangeRequestError>> {
    const resolution = input.resolution;
    return runScheduleChangeCommand<ResolveScheduleChangeRequestError>(this.deps, {
      input,
      type: "resolve",
      responder: { authority: "organizer" },
      payload: {
        outcome: resolution.outcome,
        reason: resolution.reason.trim(),
        proposedStartAt:
          resolution.outcome === "schedule_set"
            ? String(resolution.proposedStartAt.getTime())
            : null,
        winningTeamId: resolution.outcome === "walkover_intended" ? resolution.winningTeamId : null,
      },
      movesSchedule: resolution.outcome === "schedule_set",
      decide: async (context) => {
        const { request, encounter, now } = context;
        if (
          !resolution.reason.trim() ||
          (resolution.outcome === "walkover_intended" &&
            resolution.winningTeamId !== encounter.homeTeamId &&
            resolution.winningTeamId !== encounter.awayTeamId)
        ) {
          return err(
            new InvalidScheduleChangeResolution({
              code: "scheduling.invalid_schedule_change_resolution",
              message: "A reason and, for a walkover, a participating winning Team are required",
            }),
          );
        }
        const action: ScheduleChangeAction = {
          id: this.deps.ids.generate(),
          kind: "schedule_change_resolved",
          actorId: input.actorId,
          authority: "organizer",
          proposalId: currentScheduleChangeProposal(request).id,
          fromVersion: request.version,
          toVersion: request.version + 1,
          responseDeadline: currentScheduleChangeProposal(request).responseDeadline,
          processedAt: new Date(now),
          resolution: { ...resolution, reason: resolution.reason.trim() },
        };
        const transition: ScheduleChangeTransition = {
          expectedVersion: request.version,
          appendedProposal: null,
          appendedDecision: null,
          appendedApplication: null,
          appendedAction: action,
          request: {
            ...request,
            status: "resolved_by_organizer",
            version: request.version + 1,
            updatedAt: new Date(now),
            actions: [...request.actions, action],
          },
        };
        return resolution.outcome === "schedule_set"
          ? prepareScheduleChangeApplication(
              this.deps,
              context,
              transition,
              input.actorId,
              resolution.proposedStartAt,
            )
          : ok(transition);
      },
      afterCommit: (context, transition) =>
        applyScheduleChange(this.deps, context, transition, input.actorId),
    });
  }
}
