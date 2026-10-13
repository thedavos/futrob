import { ok, err, type ActorId, type Result } from "@futrob/shared-kernel";
import {
  currentScheduleChangeProposal,
  scheduleChangeVersionConflict,
  type ScheduleChangeTransition,
} from "../domain/entities/schedule-change-request.ts";
import type { ScheduleChangeAction } from "../domain/entities/schedule-change-action.ts";
import type { ScheduleChangeCommandReceipt } from "../domain/entities/schedule-change-command-receipt.ts";
import type { ScheduleChangeVersionConflict } from "../domain/errors/schedule-change-request.errors.ts";
import type { DueScheduleChangeRequest } from "../domain/ports/schedule-change-expiry-feed.port.ts";
import { requiredScheduleChangeAuthorities } from "../domain/policies/schedule-change-approval.ts";
import type { ScheduleChangeCommandDeps } from "./schedule-change-command.ts";

export class ExpireScheduleChangeProposalUseCase {
  constructor(
    private readonly deps: Pick<
      ScheduleChangeCommandDeps,
      "requests" | "rules" | "encounters" | "clock" | "ids" | "mutationLock" | "transaction"
    >,
  ) {}

  execute(
    input: DueScheduleChangeRequest & { readonly actorId: ActorId },
  ): Promise<Result<{ readonly status: "escalated" | "skipped" }, ScheduleChangeVersionConflict>> {
    return this.deps.transaction.runInTransaction(() =>
      this.deps.mutationLock.runExclusive(input.encounterId, async () => {
        const encounter = await this.deps.encounters.findById(input.encounterId);
        const request = await this.deps.requests.findById(input.organizationId, input.requestId);
        if (
          !encounter ||
          encounter.organizationId !== input.organizationId ||
          !request ||
          request.encounterId !== encounter.encounterId ||
          request.status !== "open"
        )
          return ok({ status: "skipped" });
        const now = this.deps.clock.now();
        const proposal = currentScheduleChangeProposal(request);
        if (now.getTime() < proposal.responseDeadline.getTime()) return ok({ status: "skipped" });
        const rules = await this.deps.rules.getRules({
          organizationId: request.organizationId,
          competitionId: request.competitionId,
          stageId: encounter.stageId,
        });
        const required = requiredScheduleChangeAuthorities(rules);
        if (
          required.isOk() &&
          required.value.every((authority) =>
            request.decisions.some(
              (decision) =>
                decision.proposalId === proposal.id &&
                decision.kind === "consent" &&
                decision.responder.authority === authority,
            ),
          )
        )
          return ok({ status: "skipped" });
        const action: ScheduleChangeAction = {
          id: this.deps.ids.generate(),
          kind: "schedule_change_expired",
          actorId: input.actorId,
          authority: "system",
          proposalId: proposal.id,
          fromVersion: request.version,
          toVersion: request.version + 1,
          responseDeadline: proposal.responseDeadline,
          processedAt: new Date(now),
          resolution: null,
        };
        const transition: ScheduleChangeTransition = {
          expectedVersion: request.version,
          appendedProposal: null,
          appendedDecision: null,
          appendedApplication: null,
          appendedAction: action,
          request: {
            ...request,
            status: "escalated",
            version: request.version + 1,
            updatedAt: new Date(now),
            actions: [...request.actions, action],
          },
        };
        const receipt: ScheduleChangeCommandReceipt = {
          id: this.deps.ids.generate(),
          organizationId: request.organizationId,
          requestId: request.id,
          actorId: input.actorId,
          commandKey: `schedule-change-expiry:${request.id}:${proposal.id}`,
          commandType: "expire",
          fingerprint: proposal.id,
          targetProposalId: proposal.id,
          resultingVersion: transition.request.version,
          resultingStatus: "escalated",
          createdProposalId: null,
          decisionId: null,
          occurredAt: new Date(now),
        };
        const committed = await this.deps.requests.commit(transition, receipt);
        return committed.kind === "committed"
          ? ok({ status: "escalated" })
          : err(scheduleChangeVersionConflict(request.version, committed.currentVersion));
      }),
    );
  }
}
