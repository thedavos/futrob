import {
  COMPETITION_PERMISSION,
  CompetitionAuthorizationForbidden,
  EntryNotFound,
  type ApproveCompetitionEntryUseCase,
  type CompetitionEntry,
  type CompetitionEntryRepository,
  type RegisterTeamEntryUseCase,
  type RejectCompetitionEntryUseCase,
} from "@futrob/competitions";
import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { RosterMutationPort, RosterMutationScope } from "@futrob/teams";
import type { ActivityWriter } from "@/di/notifications.module.ts";
import { runAtomically } from "./run-atomically.ts";
import { competitionName, teamName, type ActivitySubjectReaders } from "./activity-subjects.ts";

const SOURCE = "competition_entry";

/**
 * Activity of a Team's entry into a competition. A pending entry waits for the organizer
 * and closes when decided; an entry approved on creation is a fact that is over when it
 * happens. The decision itself also reaches the Team that applied.
 */
export class CompetitionEntryActivity {
  constructor(
    private readonly deps: {
      readonly writer: ActivityWriter;
      readonly readers: ActivitySubjectReaders;
    },
  ) {}

  /** An entry exists: awaiting the organizer when pending, born closed when approved. */
  async registered(entry: CompetitionEntry, actorId: ActorId): Promise<void> {
    if (entry.status === "rejected") return;
    const approved = entry.status === "approved";
    await this.deps.writer.record({
      organizationId: entry.organizationId,
      competitionId: entry.competitionId,
      kind: "competition_entry",
      source: { name: SOURCE, id: entry.id },
      resource: { type: "competition", id: entry.competitionId },
      subject: await this.names(entry),
      actorId,
      occurredAt: entry.createdAt,
      bornClosed: approved,
      recipients: [
        {
          audience: "organization",
          audienceId: entry.organizationId,
          requiresAction: !approved,
        },
      ],
    });
    // An entry approved after it was recorded as pending must not stay in Pendientes.
    if (approved) {
      await this.deps.writer.close({
        source: { name: SOURCE, id: entry.id },
        closedByActorId: actorId,
      });
    }
  }

  /** The organizer approved or rejected a pending entry. */
  async decided(entry: CompetitionEntry, actorId: ActorId): Promise<void> {
    if (entry.status === "pending") return;
    await this.deps.writer.close({
      source: { name: SOURCE, id: entry.id },
      closedByActorId: actorId,
    });
    await this.deps.writer.record({
      organizationId: entry.organizationId,
      competitionId: entry.competitionId,
      kind: "organizer_decision",
      source: { name: "organizer_decision", id: entry.id },
      resource: { type: "competition", id: entry.competitionId },
      subject: {
        ...(await this.names(entry)),
        outcome: entry.status === "approved" ? "entry_approved" : "entry_rejected",
      },
      actorId,
      bornClosed: true,
      recipients: [
        { audience: "team", audienceId: entry.teamId, requiresAction: false },
        { audience: "organization", audienceId: entry.organizationId, requiresAction: false },
      ],
    });
  }

  private async names(entry: CompetitionEntry) {
    const [competition, team] = await Promise.all([
      competitionName(this.deps.readers, entry.organizationId, entry.competitionId),
      teamName(this.deps.readers, entry.organizationId, entry.teamId),
    ]);
    return { competitionName: competition, teamName: team };
  }
}

type RegisterInput = Parameters<RegisterTeamEntryUseCase["execute"]>[0];
type DecideInput = Parameters<ApproveCompetitionEntryUseCase["execute"]>[0];

/**
 * Entry commands composed with their activity in one transaction.
 *
 * Rejecting freezes the Team's roster (ADR-0019), so it takes the same exclusion as roster
 * writes and keeps it until its transaction commits: a write that already read the entry as
 * `pending` commits first, and any later one reads `rejected`. Only an authorized request
 * for an entry of that competition queues for the lock; any other gets its typed error
 * without waiting behind roster writes and never reaches the use case, so no rejection
 * commits outside the lock.
 */
export function createCompetitionEntryCommands(deps: {
  readonly transaction: TransactionPort;
  readonly activity: CompetitionEntryActivity;
  readonly authorization: AuthorizationPort;
  readonly entries: Pick<CompetitionEntryRepository, "findById">;
  readonly rosterMutations: RosterMutationPort;
  readonly register: Pick<RegisterTeamEntryUseCase, "execute">;
  readonly approve: Pick<ApproveCompetitionEntryUseCase, "execute">;
  readonly reject: Pick<RejectCompetitionEntryUseCase, "execute">;
}) {
  const { transaction, activity } = deps;
  return {
    registerTeamEntry: {
      execute: (input: RegisterInput) =>
        runAtomically(transaction, async () => {
          const result = await deps.register.execute(input);
          if (result.isOk()) await activity.registered(result.value, input.actorId);
          return result;
        }),
    },
    approveTeamEntry: {
      execute: (input: DecideInput) =>
        runAtomically(transaction, async () => {
          const result = await deps.approve.execute(input);
          if (result.isOk()) await activity.decided(result.value, input.actorId);
          return result;
        }),
    },
    rejectTeamEntry: {
      execute: async (input: DecideInput) => {
        const reject = async () => {
          const result = await deps.reject.execute(input);
          if (result.isOk()) await activity.decided(result.value, input.actorId);
          return result;
        };
        const lockScope = await rejectionLockScope(deps, input);
        if (lockScope.isErr()) return lockScope;
        return runAtomically(transaction, () =>
          deps.rosterMutations.runExclusive(lockScope.value, reject),
        );
      },
    },
  };
}

/**
 * The roster scope a rejection must lock, or the typed error that ends the request before
 * it reaches the use case: the actor lacks `participants.manage` or the entry is not in that
 * competition. The use case re-checks both under the lock.
 */
async function rejectionLockScope(
  deps: {
    readonly authorization: AuthorizationPort;
    readonly entries: Pick<CompetitionEntryRepository, "findById">;
  },
  input: DecideInput,
): Promise<Result<RosterMutationScope, CompetitionAuthorizationForbidden | EntryNotFound>> {
  const decision = await deps.authorization.decide({
    actorId: input.actorId,
    permission: COMPETITION_PERMISSION.participantsManage,
    scope: { organizationId: input.organizationId, competitionId: input.competitionId },
  });
  if (!decision.allowed) {
    return err(
      new CompetitionAuthorizationForbidden({
        code: "authorization.forbidden",
        message: "Cannot reject entries in this competition",
        permission: COMPETITION_PERMISSION.participantsManage,
      }),
    );
  }
  const entry = await deps.entries.findById(input.organizationId, input.entryId);
  if (!entry || entry.competitionId !== input.competitionId) {
    return err(
      new EntryNotFound({
        code: "competitions.entry_not_found",
        message: "Competition entry not found",
      }),
    );
  }
  return ok({
    organizationId: input.organizationId,
    competitionId: input.competitionId,
    teamId: entry.teamId,
  });
}

export type CompetitionEntryCommands = ReturnType<typeof createCompetitionEntryCommands>;
