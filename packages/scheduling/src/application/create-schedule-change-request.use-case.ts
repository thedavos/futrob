import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type CompetitionId,
  type EncounterId,
  type EventPublisherPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
  type TransactionPort,
} from "@futrob/shared-kernel";
import {
  createInitialScheduleChangeRequest,
  type ScheduleChangeRequest,
} from "../domain/entities/schedule-change-request.ts";
import {
  ActiveScheduleChangeRequestExists,
  EncounterNotEditableForScheduleChange,
  InvalidScheduleChangeRequest,
  RescheduleLimitReached,
  ReschedulingDisabled,
  ScheduleChangeRequestForbidden,
  ScheduleChangeRequestIdempotencyConflict,
  ScheduleChangeRequestNotFound,
  type CreateScheduleChangeRequestError,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { RescheduleRequestedEvent } from "../domain/events/reschedule-requested.event.ts";
import type { CompetitionRescheduleRulesPort } from "../domain/ports/competition-reschedule-rules.port.ts";
import type { EncounterMutationLockPort } from "../domain/ports/encounter-mutation-lock.port.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { ScheduleChangeRequestEditGuardPort } from "../domain/ports/fixture-editing.ports.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";
import {
  interpretCompetitionWallTime,
  type CompetitionWallTime,
} from "../domain/policies/interpret-competition-wall-time.ts";
import {
  rescheduleScopesConflict,
  type RescheduleScope,
} from "../domain/value-objects/reschedule-scope.ts";

export interface CreateScheduleChangeRequestInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly requestingTeamId: TeamId;
  readonly scope: RescheduleScope;
  /** IANA id of the competition; persist UTC instants only after interpretation. */
  readonly timeZone: string;
  readonly proposedWallTime: CompetitionWallTime;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export class CreateScheduleChangeRequestUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly clock: ClockPort;
      readonly editGuard: ScheduleChangeRequestEditGuardPort;
      readonly encounters: EncounterScheduleRepository;
      readonly eventPublisher: EventPublisherPort;
      readonly ids: IdGeneratorPort;
      readonly mutationLock: EncounterMutationLockPort;
      readonly requests: ScheduleChangeRequestRepository;
      readonly rules: CompetitionRescheduleRulesPort;
      readonly transaction: TransactionPort;
    },
  ) {}

  async execute(
    input: CreateScheduleChangeRequestInput,
  ): Promise<Result<ScheduleChangeRequest, CreateScheduleChangeRequestError>> {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) {
      return err(invalidRequest("An idempotency key is required"));
    }

    const interpreted = interpretCompetitionWallTime({
      wallTime: input.proposedWallTime,
      timeZone: input.timeZone,
    });
    if (interpreted.isErr()) return err(interpreted.error);
    const proposedStartAt = interpreted.value;

    try {
      return await this.deps.transaction.runInTransaction(() =>
        this.deps.mutationLock.runExclusive(input.encounterId, async () => {
          const encounter = await this.deps.encounters.findById(input.encounterId);
          if (
            !encounter ||
            encounter.organizationId !== input.organizationId ||
            encounter.competitionId !== input.competitionId
          ) {
            return err(
              new ScheduleChangeRequestNotFound({
                code: "scheduling.schedule_change_encounter_not_found",
                message: "Encounter not found",
                encounterId: input.encounterId,
              }),
            );
          }

          const authorization = await this.deps.authorization.decide({
            actorId: input.actorId,
            permission: ENCOUNTER_PERMISSION.rescheduleRequest,
            scope: {
              organizationId: encounter.organizationId,
              competitionId: encounter.competitionId,
              encounterId: encounter.encounterId,
            },
          });
          if (!authorization.allowed) {
            return err(
              new ScheduleChangeRequestForbidden({
                code: "authorization.forbidden",
                message: "The actor cannot request a schedule change for this Encounter",
                permission: ENCOUNTER_PERMISSION.rescheduleRequest,
              }),
            );
          }

          if (
            input.requestingTeamId !== encounter.homeTeamId &&
            input.requestingTeamId !== encounter.awayTeamId
          ) {
            return err(invalidRequest("The requesting Team is not part of this Encounter"));
          }

          const replay = await this.deps.requests.findByIdempotencyKey(
            input.organizationId,
            idempotencyKey,
          );
          if (replay) {
            if (matchesReplay(replay, input, proposedStartAt)) return ok(replay);
            return err(
              new ScheduleChangeRequestIdempotencyConflict({
                code: "scheduling.schedule_change_idempotency_conflict",
                message: "The idempotency key was already used with a different request",
              }),
            );
          }

          const activeRequests = await this.deps.requests.listActiveByEncounter(
            input.organizationId,
            input.encounterId,
          );
          const conflictingRequest = activeRequests.find((request) =>
            rescheduleScopesConflict(request.scope, input.scope),
          );
          if (conflictingRequest) {
            return err(
              new ActiveScheduleChangeRequestExists({
                code: "scheduling.active_schedule_change_request_exists",
                message: "This schedule scope already has an active change request",
                encounterId: input.encounterId,
                activeRequestId: conflictingRequest.id,
              }),
            );
          }

          const competitionRules = await this.deps.rules.getRules({
            organizationId: input.organizationId,
            competitionId: input.competitionId,
          });
          if (!competitionRules.allowRescheduling) {
            return err(
              new ReschedulingDisabled({
                code: "scheduling.rescheduling_disabled",
                message: "Rescheduling is disabled for this competition",
              }),
            );
          }

          const appliedReschedules = await this.deps.rules.countAppliedReschedules({
            organizationId: input.organizationId,
            competitionId: input.competitionId,
            encounterId: input.encounterId,
            teamId: input.requestingTeamId,
          });
          if (appliedReschedules >= competitionRules.maxReschedulesPerTeam) {
            return err(
              new RescheduleLimitReached({
                code: "scheduling.reschedule_limit_reached",
                message: "The requesting Team has reached its reschedule limit for this Encounter",
                teamId: input.requestingTeamId,
                limit: competitionRules.maxReschedulesPerTeam,
              }),
            );
          }

          if (
            !(await this.deps.editGuard.canRequestScheduleChange({
              organizationId: input.organizationId,
              competitionId: input.competitionId,
              encounterId: input.encounterId,
              scope: input.scope,
            }))
          ) {
            return err(
              new EncounterNotEditableForScheduleChange({
                code: "scheduling.encounter_not_editable_for_schedule_change",
                message:
                  "The requested scope has a protected slot, selection, or approved result and cannot be rescheduled",
                encounterId: input.encounterId,
              }),
            );
          }

          const now = this.deps.clock.now();
          const created = createInitialScheduleChangeRequest({
            requestId: this.deps.ids.generate(),
            proposalId: this.deps.ids.generate(),
            organizationId: input.organizationId,
            competitionId: input.competitionId,
            encounterId: input.encounterId,
            homeTeamId: encounter.homeTeamId,
            awayTeamId: encounter.awayTeamId,
            officialMatchCount: encounter.officialMatchCount,
            currentStartAt: encounter.scheduledStartAt,
            requestingTeamId: input.requestingTeamId,
            initiatedByActorId: input.actorId,
            scope: input.scope,
            proposedStartAt,
            reason: input.reason,
            idempotencyKey,
            now,
          });
          if (created.isErr()) return err(created.error);

          const saved = await this.deps.requests.save(created.value);
          const initialProposal = saved.proposals[0];
          const event: RescheduleRequestedEvent = {
            eventName: "scheduling.reschedule-requested",
            occurredAt: saved.createdAt.toISOString(),
            correlationId: saved.id,
            payload: {
              requestId: saved.id,
              proposalId: initialProposal.id,
              organizationId: saved.organizationId,
              competitionId: saved.competitionId,
              encounterId: saved.encounterId,
              requestingTeamId: saved.requestingTeamId,
              scope: saved.scope,
              proposedStartAt: initialProposal.proposedStartAt.toISOString(),
              initiatedByActorId: saved.initiatedByActorId,
            },
          };
          await this.deps.eventPublisher.publish(event);
          return ok(saved);
        }),
      );
    } catch (error) {
      if (isScheduleChangeRequestSaveConflict(error)) return err(error);
      throw error;
    }
  }
}

function isScheduleChangeRequestSaveConflict(
  error: unknown,
): error is
  | ScheduleChangeRequestIdempotencyConflict
  | ActiveScheduleChangeRequestExists
  | ScheduleChangeRequestNotFound {
  return (
    error instanceof ScheduleChangeRequestIdempotencyConflict ||
    error instanceof ActiveScheduleChangeRequestExists ||
    error instanceof ScheduleChangeRequestNotFound
  );
}

function invalidRequest(message: string): InvalidScheduleChangeRequest {
  return new InvalidScheduleChangeRequest({
    code: "scheduling.invalid_schedule_change_request",
    message,
  });
}

function matchesReplay(
  request: ScheduleChangeRequest,
  input: CreateScheduleChangeRequestInput,
  proposedStartAt: Date,
): boolean {
  const proposal = request.proposals[0];
  return (
    request.organizationId === input.organizationId &&
    request.competitionId === input.competitionId &&
    request.encounterId === input.encounterId &&
    request.requestingTeamId === input.requestingTeamId &&
    request.initiatedByActorId === input.actorId &&
    scopesEqual(request.scope, input.scope) &&
    proposal.proposedStartAt.getTime() === proposedStartAt.getTime() &&
    proposal.reason === input.reason.trim()
  );
}

function scopesEqual(left: RescheduleScope, right: RescheduleScope): boolean {
  if (left.type !== right.type) return false;
  switch (left.type) {
    case "entire_encounter":
      return true;
    case "official_match":
      return right.type === "official_match" && left.officialSlot === right.officialSlot;
    default: {
      const exhaustiveScope: never = left;
      void exhaustiveScope;
      return false;
    }
  }
}
