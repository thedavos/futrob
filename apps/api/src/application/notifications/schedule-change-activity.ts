import {
  currentScheduleChangeProposal,
  requiredScheduleChangeAuthorities,
  type AcceptScheduleChangeProposalUseCase,
  type CompetitionRescheduleRulesPort,
  type CounterScheduleChangeProposalUseCase,
  type CreateScheduleChangeRequestUseCase,
  type EncounterScheduleRepository,
  type ExpireScheduleChangeProposalUseCase,
  type RejectScheduleChangeProposalUseCase,
  type ResolveScheduleChangeRequestUseCase,
  type ScheduleChangeRequest,
  type ScheduleChangeRequestRepository,
} from "@futrob/scheduling";
import type { ActorId, Result, TransactionPort } from "@futrob/shared-kernel";
import type { ActivityWriter } from "@/di/notifications.module.ts";
import { encounterSubject, teamName, type ActivitySubjectReaders } from "./activity-subjects.ts";

const PROPOSAL = "schedule_change_proposal";
const ESCALATION = "schedule_change_escalation";

/**
 * Projects a schedule change request onto the activity feed. It reconciles from the
 * request after every command, so each command and its replay converge:
 *   - the open proposal waits for the rival Team (when its approval is required) and is
 *     watched, or awaited, by the organizer (when its approval is required);
 *   - every other proposal is closed;
 *   - an escalated request waits for the organizer to decide it;
 *   - the organizer's decision reaches both Teams and the organization.
 */
export class ScheduleChangeActivity {
  constructor(
    private readonly deps: {
      readonly writer: ActivityWriter;
      readonly readers: ActivitySubjectReaders;
      readonly encounters: Pick<EncounterScheduleRepository, "findById">;
      readonly rules: Pick<CompetitionRescheduleRulesPort, "getRules">;
    },
  ) {}

  /**
   * `recordedBy` is the actor of the command. `closedBy` is who gets the credit for
   * closing rows: the system closes the window when nobody answered in time.
   */
  async project(
    request: ScheduleChangeRequest,
    recordedBy: ActorId,
    closedBy: ActorId | null = recordedBy,
  ): Promise<void> {
    const { writer } = this.deps;
    const current = currentScheduleChangeProposal(request);
    const awaitingAnswer = request.status === "open";
    for (const proposal of request.proposals) {
      if (awaitingAnswer && proposal.id === current.id) continue;
      await writer.close({
        source: { name: PROPOSAL, id: proposal.id },
        closedByActorId: closedBy,
        closedAt: request.updatedAt,
      });
    }
    if (request.status !== "escalated") {
      await writer.close({
        source: { name: ESCALATION, id: request.id },
        closedByActorId: closedBy,
        closedAt: request.updatedAt,
      });
    }

    const encounter = await this.deps.encounters.findById(request.encounterId);
    if (!encounter) return;
    const encounterNames = await encounterSubject(this.deps.readers, encounter);
    const base = {
      organizationId: request.organizationId,
      competitionId: request.competitionId,
      resource: { type: "encounter", id: request.encounterId },
    } as const;
    const organization = (requiresAction: boolean) =>
      ({
        audience: "organization",
        audienceId: request.organizationId,
        requiresAction,
      }) as const;

    if (awaitingAnswer) {
      const rules = await this.deps.rules.getRules({
        organizationId: request.organizationId,
        competitionId: request.competitionId,
        stageId: encounter.stageId,
      });
      const authorities = requiredScheduleChangeAuthorities(rules);
      const required = authorities.isOk() ? authorities.value : [];
      const rivalTeamId =
        current.proposedByTeamId === encounter.homeTeamId
          ? encounter.awayTeamId
          : encounter.homeTeamId;
      await writer.record({
        ...base,
        kind: "schedule_change",
        source: { name: PROPOSAL, id: current.id },
        subject: {
          ...encounterNames,
          teamName: await teamName(this.deps.readers, request.organizationId, rivalTeamId),
        },
        actorId: current.proposedByActorId,
        occurredAt: current.createdAt,
        expiresAt: current.responseDeadline,
        recipients: [
          ...(required.includes("rival_team")
            ? [{ audience: "team", audienceId: rivalTeamId, requiresAction: true } as const]
            : []),
          organization(required.includes("organizer")),
        ],
      });
      return;
    }

    if (request.status === "escalated") {
      await writer.record({
        ...base,
        kind: "schedule_change",
        source: { name: ESCALATION, id: request.id },
        subject: encounterNames,
        actorId: recordedBy,
        occurredAt: request.updatedAt,
        recipients: [organization(true)],
      });
      return;
    }

    if (request.status === "resolved_by_organizer") {
      const outcome = request.actions.at(-1)?.resolution?.outcome;
      if (!outcome) return;
      await writer.record({
        ...base,
        kind: "organizer_decision",
        source: { name: "organizer_decision", id: request.id },
        subject: { ...encounterNames, outcome },
        actorId: recordedBy,
        occurredAt: request.updatedAt,
        bornClosed: true,
        recipients: [
          { audience: "team", audienceId: encounter.homeTeamId, requiresAction: false },
          { audience: "team", audienceId: encounter.awayTeamId, requiresAction: false },
          organization(false),
        ],
      });
    }
  }
}

type CreateInput = Parameters<CreateScheduleChangeRequestUseCase["execute"]>[0];
type AcceptInput = Parameters<AcceptScheduleChangeProposalUseCase["execute"]>[0];
type RejectInput = Parameters<RejectScheduleChangeProposalUseCase["execute"]>[0];
type CounterInput = Parameters<CounterScheduleChangeProposalUseCase["execute"]>[0];
type ResolveInput = Parameters<ResolveScheduleChangeRequestUseCase["execute"]>[0];
type ExpireInput = Parameters<ExpireScheduleChangeProposalUseCase["execute"]>[0];

/** Schedule change commands composed with their activity in one transaction. */
export function createScheduleChangeCommands(deps: {
  readonly transaction: TransactionPort;
  readonly activity: ScheduleChangeActivity;
  readonly requests: Pick<ScheduleChangeRequestRepository, "findById">;
  readonly create: CreateScheduleChangeRequestUseCase;
  readonly accept: AcceptScheduleChangeProposalUseCase;
  readonly reject: RejectScheduleChangeProposalUseCase;
  readonly counter: CounterScheduleChangeProposalUseCase;
  readonly resolve: ResolveScheduleChangeRequestUseCase;
  readonly expire: ExpireScheduleChangeProposalUseCase;
}) {
  const { transaction, activity } = deps;

  /** Runs a command that returns the request it changed, then projects that request. */
  function projected<I extends { readonly actorId: ActorId }, V, E>(
    run: (input: I) => Promise<Result<V, E>>,
    requestOf: (value: V) => ScheduleChangeRequest,
  ) {
    return {
      execute: (input: I) =>
        transaction.runInTransaction(async () => {
          const result = await run(input);
          if (result.isOk()) await activity.project(requestOf(result.value), input.actorId);
          return result;
        }),
    };
  }
  const decided = (output: { readonly request: ScheduleChangeRequest }) => output.request;

  return {
    createScheduleChangeRequest: projected(
      (input: CreateInput) => deps.create.execute(input),
      (request) => request,
    ),
    acceptScheduleChangeProposal: projected(
      (input: AcceptInput) => deps.accept.execute(input),
      decided,
    ),
    rejectScheduleChangeProposal: projected(
      (input: RejectInput) => deps.reject.execute(input),
      decided,
    ),
    counterScheduleChangeProposal: projected(
      (input: CounterInput) => deps.counter.execute(input),
      decided,
    ),
    resolveScheduleChangeRequest: projected(
      (input: ResolveInput) => deps.resolve.execute(input),
      decided,
    ),
    /** The system escalates a request nobody answered in time; the organizer must decide. */
    expireScheduleChangeProposal: {
      execute: (input: ExpireInput) =>
        transaction.runInTransaction(async () => {
          const result = await deps.expire.execute(input);
          if (result.isOk() && result.value.status === "escalated") {
            const request = await deps.requests.findById(input.organizationId, input.requestId);
            if (request) await activity.project(request, input.actorId, null);
          }
          return result;
        }),
    },
  };
}

export type ScheduleChangeCommands = ReturnType<typeof createScheduleChangeCommands>;
