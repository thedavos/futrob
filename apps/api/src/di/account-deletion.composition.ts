import {
  ACTOR_DELETED_EVENT,
  type ActorDeletedEvent,
  CancelAccountDeletionUseCase,
  ExecuteAccountDeletionUseCase,
  GetAccountDeletionStatusUseCase,
  RequestAccountDeletionUseCase,
  type AccountDeletionBlockersPort,
  type ActorSessionsPort,
} from "@futrob/identity";
import {
  asActorId,
  type ActorId,
  type ClockPort,
  type DomainEvent,
  type EventPublisherPort,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { removeDeletedActorFromCompetitions } from "@/adapters/competitions/account-deletion.cleanup.ts";
import {
  InMemoryAccountDeletionRepository,
  InMemoryCredentialVerifier,
  PostgresAccountDeletionRepository,
  PostgresActorSessions,
  PostgresCredentialVerifier,
} from "@/adapters/identity/account-deletion.repositories.ts";
import { closeDeletedActorActivity } from "@/adapters/notifications/account-deletion.cleanup.ts";
import {
  listSoleOrganizerBlockers,
  removeDeletedActorFromOrganizations,
} from "@/adapters/organizations/account-deletion.adapters.ts";
import { removeDeletedActorPersonalStats } from "@/adapters/statistics/account-deletion.cleanup.ts";
import {
  listActiveCaptainBlockers,
  removeDeletedActorFromTeams,
} from "@/adapters/teams/account-deletion.adapters.ts";

/** One context's reaction to `identity.actor-deleted`. Must be idempotent. */
export type ActorDeletedReaction = (actorId: ActorId, at: Date) => Promise<void>;

/**
 * Delivers `identity.actor-deleted` in process to every context, inside the transaction the
 * job opened, until the outbox is wired (ADR-0029). A failing reaction rolls the deletion back.
 */
export class InProcessActorDeletedPublisher implements EventPublisherPort {
  constructor(private readonly reactions: readonly ActorDeletedReaction[]) {}

  async publish(event: DomainEvent): Promise<void> {
    if (event.eventName !== ACTOR_DELETED_EVENT) return;
    // SAFETY: only ExecuteAccountDeletion publishes ACTOR_DELETED_EVENT, with an ActorDeletedEvent payload.
    const payload = event.payload as ActorDeletedEvent["payload"];
    const actorId = asActorId(payload.actorId);
    const at = new Date(event.occurredAt);
    for (const react of this.reactions) await react(actorId, at);
  }

  async publishMany(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) await this.publish(event);
  }
}

export function postgresActorDeletedReactions(pool: Pool): ActorDeletedReaction[] {
  return [
    (actorId, at) => removeDeletedActorFromTeams(pool, actorId, at),
    (actorId) => removeDeletedActorFromOrganizations(pool, actorId),
    (actorId, at) => removeDeletedActorFromCompetitions(pool, actorId, at),
    (actorId) => removeDeletedActorPersonalStats(pool, actorId),
    (actorId, at) => closeDeletedActorActivity(pool, actorId, at),
  ];
}

export function createAccountDeletion(input: {
  readonly pool: Pool | undefined;
  readonly clock: ClockPort;
  readonly transaction: TransactionPort;
  readonly graceDays?: number;
}) {
  const { pool } = input;
  const accounts = pool
    ? new PostgresAccountDeletionRepository(pool)
    : new InMemoryAccountDeletionRepository();
  const credentials = pool
    ? new PostgresCredentialVerifier(pool)
    : new InMemoryCredentialVerifier();
  const sessions: ActorSessionsPort = pool
    ? new PostgresActorSessions(pool)
    : { revokeAll: async () => undefined };
  // Without Postgres there are no organizations or rosters that outlive the process.
  const blockers: AccountDeletionBlockersPort = pool
    ? {
        listBlockers: async (actorId) => [
          ...(await listSoleOrganizerBlockers(pool, actorId)),
          ...(await listActiveCaptainBlockers(pool, actorId)),
        ],
      }
    : { listBlockers: async () => [] };
  const events = new InProcessActorDeletedPublisher(
    pool ? postgresActorDeletedReactions(pool) : [],
  );

  return {
    accounts,
    credentials,
    get: new GetAccountDeletionStatusUseCase(accounts, blockers),
    request: new RequestAccountDeletionUseCase({
      accounts,
      blockers,
      credentials,
      sessions,
      clock: input.clock,
      graceDays: input.graceDays,
    }),
    cancel: new CancelAccountDeletionUseCase(accounts, blockers),
    run: new ExecuteAccountDeletionUseCase({
      accounts,
      blockers,
      events,
      transaction: input.transaction,
      clock: input.clock,
    }),
  };
}

export type AccountDeletionComposition = ReturnType<typeof createAccountDeletion>;
