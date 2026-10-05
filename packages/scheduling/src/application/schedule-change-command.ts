import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type CompetitionId,
  type EncounterId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type {
  ScheduleChangeCommandReceipt,
  ScheduleChangeCommandType,
} from "../domain/entities/schedule-change-command-receipt.ts";
import type { ScheduleChangeResponder } from "../domain/entities/schedule-change-decision.ts";
import {
  checkScheduleChangeTarget,
  scheduleChangeVersionConflict,
  type ScheduleChangeRequest,
  type ScheduleChangeTransition,
} from "../domain/entities/schedule-change-request.ts";
import {
  EncounterNotEditableForScheduleChange,
  InvalidScheduleChangeRequest,
  ReschedulingDisabled,
  ScheduleChangeRequestForbidden,
  ScheduleChangeRequestIdempotencyConflict,
  ScheduleChangeRequestNotFound,
  UnknownScheduleChangeRequest,
  type ScheduleChangeResponseError,
} from "../domain/errors/schedule-change-request.errors.ts";
import type {
  CompetitionRescheduleRules,
  CompetitionRescheduleRulesPort,
} from "../domain/ports/competition-reschedule-rules.port.ts";
import type { EncounterMutationLockPort } from "../domain/ports/encounter-mutation-lock.port.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { ScheduleChangeRequestEditGuardPort } from "../domain/ports/fixture-editing.ports.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";

/** Identifies the proposal a command answers and the request version it saw. */
export interface ScheduleChangeCommandInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly requestId: string;
  readonly proposalId: string;
  readonly expectedVersion: number;
  readonly commandKey: string;
}

export interface ScheduleChangeCommandOutput {
  readonly request: ScheduleChangeRequest;
  readonly receipt: ScheduleChangeCommandReceipt;
  readonly replayed: boolean;
}

export interface ScheduleChangeCommandDeps {
  readonly authorization: AuthorizationPort;
  readonly clock: ClockPort;
  readonly editGuard: ScheduleChangeRequestEditGuardPort;
  readonly encounters: Pick<EncounterScheduleRepository, "findById">;
  readonly ids: IdGeneratorPort;
  readonly mutationLock: EncounterMutationLockPort;
  readonly requests: ScheduleChangeRequestRepository;
  readonly rules: Pick<CompetitionRescheduleRulesPort, "getRules">;
  readonly transaction: TransactionPort;
}

export interface ScheduleChangeCommandContext {
  readonly encounter: EncounterScheduleSnapshot;
  readonly request: ScheduleChangeRequest;
  readonly rules: CompetitionRescheduleRules;
  readonly now: Date;
}

/**
 * Shared shell of accept, reject and counter: tenant and encounter lookup,
 * authorization of the responder (always, so a replay never outlives a revoked
 * permission), command-key replay, target checks, and the CAS commit together
 * with its receipt.
 */
export async function runScheduleChangeCommand<E>(
  deps: ScheduleChangeCommandDeps,
  command: {
    readonly input: ScheduleChangeCommandInput;
    readonly type: ScheduleChangeCommandType;
    readonly responder: ScheduleChangeResponder;
    /** Extra input that must match for a replay; serialized in a fixed key order. */
    readonly payload: Readonly<Record<string, string | number | null>>;
    /** Accept and counter move toward a new schedule; reject never does. */
    readonly movesSchedule: boolean;
    readonly decide: (
      context: ScheduleChangeCommandContext,
    ) => Promise<Result<ScheduleChangeTransition, E>>;
  },
): Promise<Result<ScheduleChangeCommandOutput, E | ScheduleChangeResponseError>> {
  const { input } = command;
  const commandKey = input.commandKey.trim();
  if (!commandKey || !Number.isInteger(input.expectedVersion) || !input.proposalId.trim()) {
    return err(invalidRequest("A command key, proposal and expected version are required"));
  }
  const fingerprint = JSON.stringify({
    type: command.type,
    requestId: input.requestId,
    proposalId: input.proposalId,
    expectedVersion: input.expectedVersion,
    authority: command.responder.authority,
    teamId: command.responder.authority === "rival_team" ? command.responder.teamId : null,
    ...command.payload,
  });

  try {
    return await deps.transaction.runInTransaction(() =>
      deps.mutationLock.runExclusive(
        input.encounterId,
        async (): Promise<Result<ScheduleChangeCommandOutput, E | ScheduleChangeResponseError>> => {
          const encounter = await deps.encounters.findById(input.encounterId);
          if (
            !encounter ||
            encounter.organizationId !== input.organizationId ||
            encounter.competitionId !== input.competitionId
          ) {
            return err(encounterNotFound(input.encounterId));
          }
          const scope = {
            organizationId: encounter.organizationId,
            competitionId: encounter.competitionId,
            encounterId: encounter.encounterId,
          };
          const canRead = await deps.authorization.decide({
            actorId: input.actorId,
            permission: ENCOUNTER_PERMISSION.read,
            scope,
          });
          if (!canRead.allowed) return err(encounterNotFound(input.encounterId));

          const request = await deps.requests.findById(input.organizationId, input.requestId);
          if (!request || request.encounterId !== encounter.encounterId) {
            return err(
              new UnknownScheduleChangeRequest({
                code: "scheduling.schedule_change_request_not_found",
                message: "Schedule change request not found",
                requestId: input.requestId,
              }),
            );
          }

          const authorized = await authorizeResponder(deps.authorization, {
            actorId: input.actorId,
            encounter,
            responder: command.responder,
          });
          if (authorized.isErr()) return err(authorized.error);

          const receipt = await deps.requests.findCommandReceipt(
            input.organizationId,
            input.actorId,
            commandKey,
          );
          if (receipt) {
            if (receipt.fingerprint !== fingerprint) return err(commandKeyReused());
            return ok({ request, receipt, replayed: true });
          }

          const target = checkScheduleChangeTarget(request, input);
          if (target.isErr()) return err(target.error);

          const rules = await deps.rules.getRules({
            organizationId: encounter.organizationId,
            competitionId: encounter.competitionId,
            stageId: encounter.stageId,
          });
          if (command.movesSchedule) {
            if (!rules.allowRescheduling) {
              return err(
                new ReschedulingDisabled({
                  code: "scheduling.rescheduling_disabled",
                  message: "Rescheduling is disabled for this competition",
                }),
              );
            }
            const editable = await deps.editGuard.canRequestScheduleChange({
              organizationId: encounter.organizationId,
              competitionId: encounter.competitionId,
              encounterId: encounter.encounterId,
              scope: request.scope,
            });
            if (!editable) {
              return err(
                new EncounterNotEditableForScheduleChange({
                  code: "scheduling.encounter_not_editable_for_schedule_change",
                  message:
                    "The requested scope has a protected slot, selection, or approved result and cannot be rescheduled",
                  encounterId: encounter.encounterId,
                }),
              );
            }
          }

          const now = deps.clock.now();
          const transition = await command.decide({ encounter, request, rules, now });
          if (transition.isErr()) return err(transition.error);

          const next = transition.value.request;
          const newReceipt: ScheduleChangeCommandReceipt = {
            id: deps.ids.generate(),
            organizationId: request.organizationId,
            requestId: request.id,
            actorId: input.actorId,
            commandKey,
            commandType: command.type,
            fingerprint,
            targetProposalId: input.proposalId,
            resultingVersion: next.version,
            resultingStatus: next.status,
            createdProposalId: transition.value.appendedProposal?.id ?? null,
            decisionId: transition.value.appendedDecision?.id ?? null,
            occurredAt: new Date(now.getTime()),
          };
          const outcome = await deps.requests.commit(transition.value, newReceipt);
          if (outcome.kind === "version_conflict") {
            return err(
              scheduleChangeVersionConflict(
                transition.value.expectedVersion,
                outcome.currentVersion,
              ),
            );
          }
          return ok({ request: next, receipt: newReceipt, replayed: false });
        },
      ),
    );
  } catch (error) {
    if (error instanceof ScheduleChangeRequestIdempotencyConflict) return err(error);
    throw error;
  }
}

async function authorizeResponder(
  authorization: AuthorizationPort,
  input: {
    readonly actorId: ActorId;
    readonly encounter: EncounterScheduleSnapshot;
    readonly responder: ScheduleChangeResponder;
  },
): Promise<Result<void, ScheduleChangeRequestForbidden | InvalidScheduleChangeRequest>> {
  const { encounter, responder } = input;
  const scope = {
    organizationId: encounter.organizationId,
    competitionId: encounter.competitionId,
    encounterId: encounter.encounterId,
  };
  if (responder.authority === "rival_team") {
    if (responder.teamId !== encounter.homeTeamId && responder.teamId !== encounter.awayTeamId) {
      return err(invalidRequest("The responding Team is not part of this Encounter"));
    }
    const decision = await authorization.decide({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.rescheduleRequest,
      scope: { ...scope, teamId: responder.teamId },
    });
    return decision.allowed
      ? ok(undefined)
      : err(forbidden(ENCOUNTER_PERMISSION.rescheduleRequest));
  }
  const decision = await authorization.decide({
    actorId: input.actorId,
    permission: ENCOUNTER_PERMISSION.rescheduleResolve,
    scope,
  });
  return decision.allowed ? ok(undefined) : err(forbidden(ENCOUNTER_PERMISSION.rescheduleResolve));
}

function forbidden(
  permission:
    | typeof ENCOUNTER_PERMISSION.rescheduleRequest
    | typeof ENCOUNTER_PERMISSION.rescheduleResolve,
): ScheduleChangeRequestForbidden {
  return new ScheduleChangeRequestForbidden({
    code: "authorization.forbidden",
    message: "The actor cannot answer this schedule change request in that capacity",
    permission,
  });
}

function encounterNotFound(encounterId: EncounterId): ScheduleChangeRequestNotFound {
  return new ScheduleChangeRequestNotFound({
    code: "scheduling.schedule_change_encounter_not_found",
    message: "Encounter not found",
    encounterId,
  });
}

function invalidRequest(message: string): InvalidScheduleChangeRequest {
  return new InvalidScheduleChangeRequest({
    code: "scheduling.invalid_schedule_change_request",
    message,
  });
}

function commandKeyReused(): ScheduleChangeRequestIdempotencyConflict {
  return new ScheduleChangeRequestIdempotencyConflict({
    code: "scheduling.schedule_change_idempotency_conflict",
    message: "The command key was already used with a different request",
  });
}
