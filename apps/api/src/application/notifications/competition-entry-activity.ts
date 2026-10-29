import type {
  ApproveCompetitionEntryUseCase,
  CompetitionEntry,
  RegisterTeamEntryUseCase,
  RejectCompetitionEntryUseCase,
} from "@futrob/competitions";
import type { ActorId, TransactionPort } from "@futrob/shared-kernel";
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

/** Entry commands composed with their activity in one transaction. */
export function createCompetitionEntryCommands(deps: {
  readonly transaction: TransactionPort;
  readonly activity: CompetitionEntryActivity;
  readonly register: RegisterTeamEntryUseCase;
  readonly approve: ApproveCompetitionEntryUseCase;
  readonly reject: RejectCompetitionEntryUseCase;
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
      execute: (input: DecideInput) =>
        runAtomically(transaction, async () => {
          const result = await deps.reject.execute(input);
          if (result.isOk()) await activity.decided(result.value, input.actorId);
          return result;
        }),
    },
  };
}

export type CompetitionEntryCommands = ReturnType<typeof createCompetitionEntryCommands>;
