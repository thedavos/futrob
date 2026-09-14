import {
  err,
  ok,
  type ActorId,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import {
  InvalidScheduleChangeRequest,
  InvalidScheduleChangeScope,
  type InvalidScheduleChangeDate,
  type InvalidScheduleChangeReason,
} from "../errors/schedule-change-request.errors.ts";
import type { RescheduleScope } from "../value-objects/reschedule-scope.ts";
import {
  createScheduleChangeProposal,
  type ScheduleChangeProposal,
} from "./schedule-change-proposal.ts";

export type ScheduleChangeRequestStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired"
  | "escalated";

export interface ScheduleChangeRequest {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly requestingTeamId: TeamId;
  readonly initiatedByActorId: ActorId;
  readonly scope: RescheduleScope;
  readonly status: ScheduleChangeRequestStatus;
  readonly proposals: readonly [ScheduleChangeProposal, ...ScheduleChangeProposal[]];
  readonly idempotencyKey: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateInitialScheduleChangeRequestInput {
  readonly requestId: string;
  readonly proposalId: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly officialMatchCount: 1 | 2;
  readonly currentStartAt: Date;
  readonly requestingTeamId: TeamId;
  readonly initiatedByActorId: ActorId;
  readonly scope: RescheduleScope;
  readonly proposedStartAt: Date;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly now: Date;
}

export type CreateInitialScheduleChangeRequestError =
  | InvalidScheduleChangeRequest
  | InvalidScheduleChangeScope
  | InvalidScheduleChangeDate
  | InvalidScheduleChangeReason;

export function createInitialScheduleChangeRequest(
  input: CreateInitialScheduleChangeRequestInput,
): Result<ScheduleChangeRequest, CreateInitialScheduleChangeRequestError> {
  const idempotencyKey = input.idempotencyKey.trim();
  if (
    !input.requestId.trim() ||
    !input.proposalId.trim() ||
    !idempotencyKey ||
    (input.requestingTeamId !== input.homeTeamId &&
      input.requestingTeamId !== input.awayTeamId)
  ) {
    return err(
      new InvalidScheduleChangeRequest({
        code: "scheduling.invalid_schedule_change_request",
        message: "The schedule change request is invalid",
      }),
    );
  }

  if (!isValidScope(input.scope, input.officialMatchCount)) {
    return err(
      new InvalidScheduleChangeScope({
        code: "scheduling.invalid_schedule_change_scope",
        message: "The requested OfficialMatch slot does not exist",
        encounterId: input.encounterId,
      }),
    );
  }

  const proposal = createScheduleChangeProposal({
    id: input.proposalId,
    proposedStartAt: input.proposedStartAt,
    currentStartAt: input.currentStartAt,
    proposedByActorId: input.initiatedByActorId,
    proposedByTeamId: input.requestingTeamId,
    reason: input.reason,
    now: input.now,
  });
  if (proposal.isErr()) return proposal;

  const createdAt = new Date(input.now.getTime());
  return ok({
    id: input.requestId,
    organizationId: input.organizationId,
    competitionId: input.competitionId,
    encounterId: input.encounterId,
    requestingTeamId: input.requestingTeamId,
    initiatedByActorId: input.initiatedByActorId,
    scope: copyScope(input.scope),
    status: "open",
    proposals: [proposal.value],
    idempotencyKey,
    createdAt,
    updatedAt: new Date(createdAt),
  });
}

function copyScope(scope: RescheduleScope): RescheduleScope {
  switch (scope.type) {
    case "entire_encounter":
      return { type: "entire_encounter" };
    case "official_match":
      return { type: "official_match", officialSlot: scope.officialSlot };
    default: {
      const exhaustiveScope: never = scope;
      void exhaustiveScope;
      return { type: "entire_encounter" };
    }
  }
}

function isValidScope(scope: RescheduleScope, officialMatchCount: 1 | 2): boolean {
  switch (scope.type) {
    case "entire_encounter":
      return true;
    case "official_match":
      return (
        scope.officialSlot === 1 ||
        (scope.officialSlot === 2 && officialMatchCount === 2)
      );
    default: {
      const exhaustiveScope: never = scope;
      void exhaustiveScope;
      return false;
    }
  }
}
