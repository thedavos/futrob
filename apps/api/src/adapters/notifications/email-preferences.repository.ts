import type { EmailPreferences, EmailPreferencesRepository } from "@futrob/notifications";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const COLUMNS = "actor_id, locale, non_critical_email, unsubscribe_token, updated_at";

const preferencesRowSchema = z.object({
  actor_id: pgTextSchema,
  locale: z.enum(["es", "en"]),
  non_critical_email: z.boolean(),
  unsubscribe_token: pgTextSchema,
  updated_at: pgTimestampSchema,
});

type PreferencesRow = z.infer<typeof preferencesRowSchema>;

function toPreferences(parsed: PreferencesRow): EmailPreferences {
  return {
    actorId: asActorId(parsed.actor_id),
    locale: parsed.locale,
    nonCriticalEmail: parsed.non_critical_email,
    unsubscribeToken: parsed.unsubscribe_token,
    updatedAt: parsed.updated_at,
  };
}

export class PostgresEmailPreferencesRepository implements EmailPreferencesRepository {
  constructor(private readonly pool: Pool) {}

  async findByActor(actorId: ActorId): Promise<EmailPreferences | null> {
    const found = await getPgExecutor(this.pool).query(
      `SELECT ${COLUMNS} FROM notification_email_preferences WHERE actor_id = $1`,
      [actorId],
    );
    return found.rows[0] ? toPreferences(preferencesRowSchema.parse(found.rows[0])) : null;
  }

  async findByUnsubscribeToken(token: string): Promise<EmailPreferences | null> {
    const found = await getPgExecutor(this.pool).query(
      `SELECT ${COLUMNS} FROM notification_email_preferences WHERE unsubscribe_token = $1`,
      [token],
    );
    return found.rows[0] ? toPreferences(preferencesRowSchema.parse(found.rows[0])) : null;
  }

  async insertIfAbsent(preferences: EmailPreferences): Promise<EmailPreferences> {
    const executor = getPgExecutor(this.pool);
    await executor.query(
      `INSERT INTO notification_email_preferences (${COLUMNS})
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (actor_id) DO NOTHING`,
      [
        preferences.actorId,
        preferences.locale,
        preferences.nonCriticalEmail,
        preferences.unsubscribeToken,
        preferences.updatedAt,
      ],
    );
    const stored = await this.findByActor(preferences.actorId);
    if (!stored) throw new Error("Email preferences vanished after insert");
    return stored;
  }

  async save(preferences: EmailPreferences): Promise<EmailPreferences> {
    const saved = await getPgExecutor(this.pool).query(
      `INSERT INTO notification_email_preferences (${COLUMNS})
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (actor_id) DO UPDATE SET
         locale = EXCLUDED.locale,
         non_critical_email = EXCLUDED.non_critical_email,
         updated_at = EXCLUDED.updated_at
       RETURNING ${COLUMNS}`,
      [
        preferences.actorId,
        preferences.locale,
        preferences.nonCriticalEmail,
        preferences.unsubscribeToken,
        preferences.updatedAt,
      ],
    );
    return toPreferences(preferencesRowSchema.parse(saved.rows[0]));
  }
}

export class InMemoryEmailPreferencesRepository implements EmailPreferencesRepository {
  private readonly rows = new Map<ActorId, EmailPreferences>();

  async findByActor(actorId: ActorId): Promise<EmailPreferences | null> {
    return this.rows.get(actorId) ?? null;
  }

  async findByUnsubscribeToken(token: string): Promise<EmailPreferences | null> {
    return [...this.rows.values()].find((row) => row.unsubscribeToken === token) ?? null;
  }

  async insertIfAbsent(preferences: EmailPreferences): Promise<EmailPreferences> {
    const existing = this.rows.get(preferences.actorId);
    if (existing) return existing;
    this.rows.set(preferences.actorId, preferences);
    return preferences;
  }

  /** Keeps the stored token, like the Postgres upsert. */
  async save(preferences: EmailPreferences): Promise<EmailPreferences> {
    const existing = this.rows.get(preferences.actorId);
    const next = existing
      ? { ...preferences, unsubscribeToken: existing.unsubscribeToken }
      : preferences;
    this.rows.set(preferences.actorId, next);
    return next;
  }
}
