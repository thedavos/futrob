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
  ScheduleChangeAuthorityNotRequired,
  ScheduleChangeConsentAlreadyRecorded,
  ScheduleChangeProposalStale,
  ScheduleChangeRequestClosed,
  ScheduleChangeSelfResponseForbidden,
  ScheduleChangeVersionConflict,
  type InvalidScheduleChangeDate,
  type InvalidScheduleChangeReason,
} from "../errors/schedule-change-request.errors.ts";
import {
  copyRescheduleScope,
  isRescheduleScopeOf,
  type RescheduleScope,
} from "../value-objects/reschedule-scope.ts";
import type { ScheduleChangeApplication } from "./schedule-change-application.ts";
import type {
  ScheduleChangeAuthority,
  ScheduleChangeDecision,
  ScheduleChangeResponder,
} from "./schedule-change-decision.ts";
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
  /** Incremented by every negotiation command; commands carry it for CAS. */
  readonly version: number;
  /** Append-only. The last proposal is the current one. */
  readonly proposals: readonly [ScheduleChangeProposal, ...ScheduleChangeProposal[]];
  /** Append-only answers, each bound to the proposal and version it answered. */
  readonly decisions: readonly ScheduleChangeDecision[];
  /** The schedule applied when the request became `accepted`; null otherwise. */
  readonly application: ScheduleChangeApplication | null;
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
    (input.requestingTeamId !== input.homeTeamId && input.requestingTeamId !== input.awayTeamId)
  ) {
    return err(
      new InvalidScheduleChangeRequest({
        code: "scheduling.invalid_schedule_change_request",
        message: "The schedule change request is invalid",
      }),
    );
  }

  if (!isRescheduleScopeOf(input.scope, input.officialMatchCount)) {
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
    scope: copyRescheduleScope(input.scope),
    status: "open",
    version: 1,
    proposals: [proposal.value],
    decisions: [],
    application: null,
    idempotencyKey,
    createdAt,
    updatedAt: new Date(createdAt),
  });
}

export function currentScheduleChangeProposal(
  request: Pick<ScheduleChangeRequest, "proposals">,
): ScheduleChangeProposal {
  return request.proposals.at(-1) ?? request.proposals[0];
}

/** What a negotiation command appends; persisted atomically with a version CAS. */
export interface ScheduleChangeTransition {
  readonly request: ScheduleChangeRequest;
  readonly expectedVersion: number;
  readonly appendedProposal: ScheduleChangeProposal | null;
  readonly appendedDecision: ScheduleChangeDecision | null;
  readonly appendedApplication: ScheduleChangeApplication | null;
}

export interface ScheduleChangeTarget {
  readonly proposalId: string;
  readonly expectedVersion: number;
}

export type ScheduleChangeTargetError =
  | ScheduleChangeRequestClosed
  | ScheduleChangeVersionConflict
  | ScheduleChangeProposalStale;

/** A command may only answer the current proposal of an open request at the version it saw. */
export function checkScheduleChangeTarget(
  request: ScheduleChangeRequest,
  target: ScheduleChangeTarget,
): Result<ScheduleChangeProposal, ScheduleChangeTargetError> {
  if (request.status !== "open") {
    return err(
      new ScheduleChangeRequestClosed({
        code: "scheduling.schedule_change_request_closed",
        message: "The schedule change request is no longer open",
        status: request.status,
      }),
    );
  }
  if (request.version !== target.expectedVersion) {
    return err(scheduleChangeVersionConflict(target.expectedVersion, request.version));
  }
  const current = currentScheduleChangeProposal(request);
  if (current.id !== target.proposalId) {
    return err(
      new ScheduleChangeProposalStale({
        code: "scheduling.schedule_change_proposal_stale",
        message: "The proposal was superseded by a newer proposal",
        proposalId: target.proposalId,
        currentProposalId: current.id,
      }),
    );
  }
  return ok(current);
}

export function scheduleChangeVersionConflict(
  expectedVersion: number,
  currentVersion: number,
): ScheduleChangeVersionConflict {
  return new ScheduleChangeVersionConflict({
    code: "scheduling.schedule_change_version_conflict",
    message: "The schedule change request changed since it was read",
    expectedVersion,
    currentVersion,
  });
}

export interface ScheduleChangeDecisionInput {
  readonly target: ScheduleChangeTarget;
  readonly decisionId: string;
  readonly responder: ScheduleChangeResponder;
  readonly actorId: ActorId;
  readonly requiredAuthorities: readonly ScheduleChangeAuthority[];
  readonly reason: string | null;
  readonly now: Date;
}

export type ScheduleChangeDecisionError =
  | ScheduleChangeTargetError
  | ScheduleChangeAuthorityNotRequired
  | ScheduleChangeSelfResponseForbidden
  | ScheduleChangeConsentAlreadyRecorded;

/**
 * Records one required consent on the current proposal. The request becomes
 * `accepted` once every required authority consented to that same proposal;
 * consents given to earlier proposals never count.
 */
export function consentToScheduleChange(
  request: ScheduleChangeRequest,
  input: ScheduleChangeDecisionInput,
): Result<ScheduleChangeTransition, ScheduleChangeDecisionError> {
  const prepared = prepareDecision(request, input);
  if (prepared.isErr()) return err(prepared.error);
  const { proposal } = prepared.value;

  const consents = consentsFor(request, proposal.id);
  if (
    consents.some(
      (decision) =>
        decision.responder.authority === input.responder.authority ||
        decision.actorId === input.actorId,
    )
  ) {
    return err(
      new ScheduleChangeConsentAlreadyRecorded({
        code: "scheduling.schedule_change_consent_already_recorded",
        message: "This authority or actor already consented to the current proposal",
        proposalId: proposal.id,
      }),
    );
  }

  const decision = buildDecision(request, proposal.id, "consent", input);
  const granted = new Set([...consents, decision].map((entry) => entry.responder.authority));
  const accepted = input.requiredAuthorities.every((authority) => granted.has(authority));
  return ok(
    nextTransition(request, input.now, {
      status: accepted ? "accepted" : "open",
      appendedProposal: null,
      appendedDecision: decision,
    }),
  );
}

/** A required authority refuses the current proposal; the schedule is untouched. */
export function rejectScheduleChange(
  request: ScheduleChangeRequest,
  input: ScheduleChangeDecisionInput,
): Result<ScheduleChangeTransition, ScheduleChangeDecisionError> {
  const prepared = prepareDecision(request, input);
  if (prepared.isErr()) return err(prepared.error);
  const decision = buildDecision(request, prepared.value.proposal.id, "rejection", input);
  return ok(
    nextTransition(request, input.now, {
      status: "rejected",
      appendedProposal: null,
      appendedDecision: decision,
    }),
  );
}

export interface CounterScheduleChangeInput {
  readonly target: ScheduleChangeTarget;
  readonly proposal: ScheduleChangeProposal;
  readonly now: Date;
}

/**
 * The rival of the current proposal answers with a new date. The new proposal
 * becomes current, so consent must be given again; history keeps both.
 */
export function counterScheduleChange(
  request: ScheduleChangeRequest,
  input: CounterScheduleChangeInput,
): Result<
  ScheduleChangeTransition,
  ScheduleChangeTargetError | ScheduleChangeSelfResponseForbidden
> {
  const current = checkScheduleChangeTarget(request, input.target);
  if (current.isErr()) return err(current.error);
  if (
    input.proposal.proposedByTeamId === current.value.proposedByTeamId ||
    input.proposal.proposedByActorId === current.value.proposedByActorId
  ) {
    return err(selfResponseForbidden());
  }
  return ok(
    nextTransition(request, input.now, {
      status: "open",
      appendedProposal: input.proposal,
      appendedDecision: null,
    }),
  );
}

function prepareDecision(
  request: ScheduleChangeRequest,
  input: ScheduleChangeDecisionInput,
): Result<
  { readonly proposal: ScheduleChangeProposal },
  | ScheduleChangeTargetError
  | ScheduleChangeAuthorityNotRequired
  | ScheduleChangeSelfResponseForbidden
> {
  const current = checkScheduleChangeTarget(request, input.target);
  if (current.isErr()) return err(current.error);
  const proposal = current.value;
  if (!input.requiredAuthorities.includes(input.responder.authority)) {
    return err(
      new ScheduleChangeAuthorityNotRequired({
        code: "scheduling.schedule_change_authority_not_required",
        message: "This competition does not require that authority to answer the proposal",
        authority: input.responder.authority,
      }),
    );
  }
  if (
    input.responder.authority === "rival_team" &&
    (input.responder.teamId === proposal.proposedByTeamId ||
      input.actorId === proposal.proposedByActorId)
  ) {
    return err(selfResponseForbidden());
  }
  return ok({ proposal });
}

function consentsFor(
  request: ScheduleChangeRequest,
  proposalId: string,
): readonly ScheduleChangeDecision[] {
  return request.decisions.filter(
    (decision) => decision.proposalId === proposalId && decision.kind === "consent",
  );
}

function buildDecision(
  request: ScheduleChangeRequest,
  proposalId: string,
  kind: ScheduleChangeDecision["kind"],
  input: ScheduleChangeDecisionInput,
): ScheduleChangeDecision {
  const reason = input.reason?.trim();
  return {
    id: input.decisionId,
    proposalId,
    requestVersion: request.version,
    kind,
    responder:
      input.responder.authority === "rival_team"
        ? { authority: "rival_team", teamId: input.responder.teamId }
        : { authority: "organizer" },
    actorId: input.actorId,
    reason: reason ? reason : null,
    createdAt: new Date(input.now.getTime()),
  };
}

function nextTransition(
  request: ScheduleChangeRequest,
  now: Date,
  change: {
    readonly status: ScheduleChangeRequestStatus;
    readonly appendedProposal: ScheduleChangeProposal | null;
    readonly appendedDecision: ScheduleChangeDecision | null;
  },
): ScheduleChangeTransition {
  return {
    expectedVersion: request.version,
    appendedProposal: change.appendedProposal,
    appendedDecision: change.appendedDecision,
    appendedApplication: null,
    request: {
      ...request,
      status: change.status,
      version: request.version + 1,
      proposals: change.appendedProposal
        ? [...request.proposals, change.appendedProposal]
        : request.proposals,
      decisions: change.appendedDecision
        ? [...request.decisions, change.appendedDecision]
        : request.decisions,
      updatedAt: new Date(now.getTime()),
    },
  };
}

function selfResponseForbidden(): ScheduleChangeSelfResponseForbidden {
  return new ScheduleChangeSelfResponseForbidden({
    code: "scheduling.schedule_change_self_response_forbidden",
    message: "Only the rival of the proposing Team can answer this proposal",
  });
}
