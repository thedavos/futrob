import {
  CREDENTIAL_IDENTITY_PROVIDER,
  type AccountDeletionRepository,
  type AccountDeletionState,
  type ActorSessionsPort,
  type CredentialVerifierPort,
} from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import { verifyPassword } from "better-auth/crypto";
import type { Pool } from "pg";
import { z } from "zod";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const deletionRowSchema = z.object({
  deletion_requested_at: z.date().nullable(),
  deletion_scheduled_for: z.date().nullable(),
  deleted_at: z.date().nullable(),
});

/** Better Auth users signed in as this actor, through the credential identity subject. */
const CREDENTIAL_USERS_SQL = `SELECT subject FROM identity_subjects
  WHERE actor_id = $1 AND provider = '${CREDENTIAL_IDENTITY_PROVIDER}'`;

/** Account lifecycle columns on `actors` (migration 0067, ADR-0030). */
export class PostgresAccountDeletionRepository implements AccountDeletionRepository {
  constructor(private readonly pool: Pool) {}

  async findState(actorId: ActorId): Promise<AccountDeletionState> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT deletion_requested_at, deletion_scheduled_for, deleted_at
       FROM actors WHERE id = $1`,
      [actorId],
    );
    const row = result.rows[0];
    if (!row) return { kind: "active" };
    const parsed = deletionRowSchema.parse(row);
    if (parsed.deleted_at) return { kind: "deleted", deletedAt: parsed.deleted_at };
    if (parsed.deletion_requested_at && parsed.deletion_scheduled_for) {
      return {
        kind: "scheduled",
        requestedAt: parsed.deletion_requested_at,
        scheduledFor: parsed.deletion_scheduled_for,
      };
    }
    return { kind: "active" };
  }

  async schedule(input: {
    readonly actorId: ActorId;
    readonly requestedAt: Date;
    readonly scheduledFor: Date;
  }): Promise<void> {
    // A concurrent request that scheduled first keeps its dates.
    await getPgExecutor(this.pool).query(
      `UPDATE actors SET deletion_requested_at = $2, deletion_scheduled_for = $3
       WHERE id = $1 AND deletion_requested_at IS NULL AND deleted_at IS NULL`,
      [input.actorId, input.requestedAt, input.scheduledFor],
    );
  }

  async cancel(actorId: ActorId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `UPDATE actors SET deletion_requested_at = NULL, deletion_scheduled_for = NULL
       WHERE id = $1 AND deleted_at IS NULL`,
      [actorId],
    );
  }

  async listDue(input: {
    readonly now: Date;
    readonly limit: number;
  }): Promise<readonly ActorId[]> {
    const result = await getPgExecutor(this.pool).query<{ id: string }>(
      `SELECT id FROM actors
       WHERE deletion_scheduled_for <= $1 AND deleted_at IS NULL
       ORDER BY deletion_scheduled_for, id
       LIMIT $2`,
      [input.now, input.limit],
    );
    return result.rows.map((row) => asActorId(row.id));
  }

  async anonymize(input: {
    readonly actorId: ActorId;
    readonly deletedAt: Date;
  }): Promise<boolean> {
    const db = getPgExecutor(this.pool);
    // Marking first takes the row lock, so a cancel that won the race leaves nothing to do.
    const marked = await db.query(
      `UPDATE actors SET deleted_at = $2
       WHERE id = $1 AND deleted_at IS NULL AND deletion_scheduled_for <= $2`,
      [input.actorId, input.deletedAt],
    );
    if (marked.rowCount === 0) return false;
    // Cascades auth_sessions and auth_accounts: no cookie or bearer token survives.
    await db.query(`DELETE FROM auth_users WHERE id IN (${CREDENTIAL_USERS_SQL})`, [input.actorId]);
    await db.query(`DELETE FROM identity_subjects WHERE actor_id = $1`, [input.actorId]);
    await db.query(`DELETE FROM actor_contact_profiles WHERE actor_id = $1`, [input.actorId]);
    await db.query(`DELETE FROM actor_preferences WHERE actor_id = $1`, [input.actorId]);
    return true;
  }
}

export class PostgresActorSessions implements ActorSessionsPort {
  constructor(private readonly pool: Pool) {}

  async revokeAll(actorId: ActorId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM auth_sessions WHERE user_id IN (${CREDENTIAL_USERS_SQL})`,
      [actorId],
    );
  }
}

/** Checks the password against the Better Auth credential hash with Better Auth's verifier. */
export class PostgresCredentialVerifier implements CredentialVerifierPort {
  constructor(private readonly pool: Pool) {}

  async verifyPassword(input: { readonly actorId: ActorId; readonly password: string }) {
    const result = await getPgExecutor(this.pool).query<{ password: string }>(
      `SELECT account.password FROM auth_accounts account
       WHERE account.provider_id = 'credential' AND account.password IS NOT NULL
         AND account.user_id IN (${CREDENTIAL_USERS_SQL})`,
      [input.actorId],
    );
    for (const row of result.rows) {
      if (await verifyPassword({ hash: row.password, password: input.password })) return true;
    }
    return false;
  }
}

/** Process-local lifecycle for the API without `DATABASE_URL`, where auth is unavailable. */
export class InMemoryAccountDeletionRepository implements AccountDeletionRepository {
  readonly states = new Map<ActorId, AccountDeletionState>();

  async findState(actorId: ActorId): Promise<AccountDeletionState> {
    return this.states.get(actorId) ?? { kind: "active" };
  }

  async schedule(input: {
    readonly actorId: ActorId;
    readonly requestedAt: Date;
    readonly scheduledFor: Date;
  }): Promise<void> {
    if (this.states.has(input.actorId)) return;
    this.states.set(input.actorId, {
      kind: "scheduled",
      requestedAt: input.requestedAt,
      scheduledFor: input.scheduledFor,
    });
  }

  async cancel(actorId: ActorId): Promise<void> {
    if (this.states.get(actorId)?.kind === "scheduled") this.states.delete(actorId);
  }

  async listDue(input: {
    readonly now: Date;
    readonly limit: number;
  }): Promise<readonly ActorId[]> {
    return [...this.states]
      .flatMap(([actorId, state]) =>
        state.kind === "scheduled" && state.scheduledFor <= input.now ? [actorId] : [],
      )
      .slice(0, input.limit);
  }

  async anonymize(input: {
    readonly actorId: ActorId;
    readonly deletedAt: Date;
  }): Promise<boolean> {
    const state = this.states.get(input.actorId);
    if (state?.kind !== "scheduled" || state.scheduledFor > input.deletedAt) return false;
    this.states.set(input.actorId, { kind: "deleted", deletedAt: input.deletedAt });
    return true;
  }
}

/** Without Postgres there are no credentials; tests register the passwords they use. */
export class InMemoryCredentialVerifier implements CredentialVerifierPort {
  readonly passwords = new Map<ActorId, string>();

  async verifyPassword(input: { readonly actorId: ActorId; readonly password: string }) {
    return this.passwords.get(input.actorId) === input.password;
  }
}
