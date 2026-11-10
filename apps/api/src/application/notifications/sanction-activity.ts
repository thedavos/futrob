import type {
  CompetitionSanction,
  ImposeSanctionError,
  ImposeSanctionInput,
  RevokeSanctionError,
  RevokeSanctionInput,
} from "@futrob/competitions";
import type { ActorId, Result, TransactionPort } from "@futrob/shared-kernel";
import type { ActivityWriter } from "@/di/notifications.module.ts";
import { runAtomically } from "./run-atomically.ts";
import { competitionName, teamName, type ActivitySubjectReaders } from "./activity-subjects.ts";

/**
 * Activity of a sanction for the affected Team and the organization (ADR-0028). The reason
 * stays in the sanction; the feed only names the decision.
 *
 * Extension point for MAIL-01: when email exists, `imposed` and `revoked` are where the
 * sanctioned Team's captain is mailed. Both receive the stored sanction inside the command
 * transaction, so a mail outbox write commits or rolls back with it. The use cases do not
 * change.
 */
export class SanctionActivity {
  constructor(
    private readonly deps: {
      readonly writer: ActivityWriter;
      readonly readers: ActivitySubjectReaders;
    },
  ) {}

  imposed(sanction: CompetitionSanction): Promise<void> {
    return this.record(sanction, {
      sourceId: `sanction:${sanction.id}`,
      outcome: "sanction_imposed",
      actorId: sanction.imposedByActorId,
      occurredAt: sanction.imposedAt,
    });
  }

  revoked(sanction: CompetitionSanction): Promise<void> {
    if (sanction.revocation === null) return Promise.resolve();
    return this.record(sanction, {
      sourceId: `sanction-revocation:${sanction.id}`,
      outcome: "sanction_revoked",
      actorId: sanction.revocation.actorId,
      occurredAt: sanction.revocation.at,
    });
  }

  private async record(
    sanction: CompetitionSanction,
    fact: {
      readonly sourceId: string;
      readonly outcome: "sanction_imposed" | "sanction_revoked";
      readonly actorId: ActorId;
      readonly occurredAt: Date;
    },
  ): Promise<void> {
    const [competition, team] = await Promise.all([
      competitionName(this.deps.readers, sanction.organizationId, sanction.competitionId),
      teamName(this.deps.readers, sanction.organizationId, sanction.teamId),
    ]);
    await this.deps.writer.record({
      organizationId: sanction.organizationId,
      competitionId: sanction.competitionId,
      kind: "organizer_decision",
      source: { name: "organizer_decision", id: fact.sourceId },
      resource: { type: "competition", id: sanction.competitionId },
      subject: { competitionName: competition, teamName: team, outcome: fact.outcome },
      actorId: fact.actorId,
      occurredAt: fact.occurredAt,
      bornClosed: true,
      recipients: [
        { audience: "team", audienceId: sanction.teamId, requiresAction: false },
        {
          audience: "organization",
          audienceId: sanction.organizationId,
          requiresAction: false,
        },
      ],
    });
  }
}

/** The table effect of a sanction: rebuilds statistics when it moves points. */
export interface SanctionTableEffect {
  apply(sanction: CompetitionSanction): Promise<void>;
}

/**
 * Impose and revoke, each with its table rebuild and activity in one transaction. If the
 * rebuild or the activity fails, the sanction is not stored.
 */
export function createSanctionCommands(deps: {
  readonly transaction: TransactionPort;
  readonly activity: SanctionActivity;
  readonly table: SanctionTableEffect;
  readonly impose: {
    execute(input: ImposeSanctionInput): Promise<Result<CompetitionSanction, ImposeSanctionError>>;
  };
  readonly revoke: {
    execute(input: RevokeSanctionInput): Promise<Result<CompetitionSanction, RevokeSanctionError>>;
  };
}) {
  const { transaction, activity, table } = deps;
  return {
    impose: {
      execute: (input: ImposeSanctionInput) =>
        runAtomically(transaction, async () => {
          const result = await deps.impose.execute(input);
          if (result.isOk()) {
            await table.apply(result.value);
            await activity.imposed(result.value);
          }
          return result;
        }),
    },
    revoke: {
      execute: (input: RevokeSanctionInput) =>
        runAtomically(transaction, async () => {
          const result = await deps.revoke.execute(input);
          if (result.isOk()) {
            await table.apply(result.value);
            await activity.revoked(result.value);
          }
          return result;
        }),
    },
  };
}

export type SanctionCommands = ReturnType<typeof createSanctionCommands>;
