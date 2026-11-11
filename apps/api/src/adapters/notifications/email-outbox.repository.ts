import {
  EMAIL_DELIVERY_STATUS,
  type EmailDelivery,
  type EmailDeliveryOutcome,
  type EmailIntent,
  type EmailMessage,
  type EmailOutboxRepository,
} from "@futrob/notifications";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import {
  pgNullableTextSchema,
  pgTextSchema,
  pgTimestampSchema,
} from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const COLUMNS = `id, event_id, channel, organization_id, recipient_actor_id, template, intent,
  status, attempts, next_attempt_at, last_error, skip_reason, provider_message_id, created_at,
  settled_at, message`;

const names = {
  path: z.string(),
  competitionName: z.string().nullable(),
  encounterLabel: z.string().nullable(),
  teamName: z.string().nullable(),
};

const intentSchema: z.ZodType<EmailIntent> = z.discriminatedUnion("template", [
  z.object({ ...names, template: z.literal("registration"), requiresAction: z.boolean() }),
  z.object({ ...names, template: z.literal("upcoming_match"), startsAt: z.string() }),
  z.object({ ...names, template: z.literal("reschedule"), requiresAction: z.boolean() }),
  z.object({ ...names, template: z.literal("ea_candidates"), candidateCount: z.number() }),
  z.object({ ...names, template: z.literal("proposed_selection"), requiresAction: z.boolean() }),
  z.object({
    ...names,
    template: z.literal("result_or_dispute"),
    result: z.enum(["official", "disputed"]),
  }),
  z.object({
    ...names,
    template: z.literal("organizer_decision"),
    outcome: z
      .enum([
        "entry_approved",
        "entry_rejected",
        "schedule_set",
        "schedule_kept",
        "walkover_intended",
      ])
      .nullable(),
  }),
  z.object({ ...names, template: z.literal("sanction") }),
]);

const messageSchema: z.ZodType<EmailMessage> = z.object({
  to: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  headers: z.record(z.string(), z.string()),
  idempotencyKey: z.string(),
});

const nullableTimestampSchema = z.union([z.null(), pgTimestampSchema]);

const deliveryRowSchema = z.object({
  id: pgTextSchema,
  event_id: pgTextSchema,
  channel: z.literal("email"),
  organization_id: pgTextSchema,
  recipient_actor_id: pgTextSchema,
  intent: intentSchema,
  status: z.enum(["pending", "sent", "skipped", "failed"]),
  attempts: z.number().int(),
  next_attempt_at: pgTimestampSchema,
  last_error: pgNullableTextSchema,
  skip_reason: z.enum(["plan_without_email", "opted_out", "no_address"]).nullable(),
  provider_message_id: pgNullableTextSchema,
  created_at: pgTimestampSchema,
  settled_at: nullableTimestampSchema,
  message: messageSchema.nullable(),
});

type DeliveryRow = z.infer<typeof deliveryRowSchema>;

function toDelivery(parsed: DeliveryRow): EmailDelivery {
  return {
    id: parsed.id,
    eventId: parsed.event_id,
    channel: parsed.channel,
    organizationId: asOrganizationId(parsed.organization_id),
    recipientActorId: asActorId(parsed.recipient_actor_id),
    intent: parsed.intent,
    status: parsed.status,
    attempts: parsed.attempts,
    nextAttemptAt: parsed.next_attempt_at,
    lastError: parsed.last_error,
    skipReason: parsed.skip_reason,
    providerMessageId: parsed.provider_message_id,
    createdAt: parsed.created_at,
    settledAt: parsed.settled_at,
    message: parsed.message,
  };
}

const byDueThenId = (left: EmailDelivery, right: EmailDelivery) =>
  left.nextAttemptAt.getTime() - right.nextAttemptAt.getTime() ||
  (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

/**
 * Email outbox in Postgres. `enqueue` joins the ambient transaction of the command that
 * produced the fact; `claimDue` skips rows another runner holds, so runners never share one.
 */
export class PostgresEmailOutboxRepository implements EmailOutboxRepository {
  constructor(private readonly pool: Pool) {}

  async enqueue(deliveries: readonly EmailDelivery[]): Promise<void> {
    const executor = getPgExecutor(this.pool);
    for (const delivery of deliveries) {
      await executor.query(
        `INSERT INTO email_outbox (${COLUMNS})
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15,
           $16::jsonb)
         ON CONFLICT (event_id, channel, recipient_actor_id) DO NOTHING`,
        [
          delivery.id,
          delivery.eventId,
          delivery.channel,
          delivery.organizationId,
          delivery.recipientActorId,
          delivery.intent.template,
          JSON.stringify(delivery.intent),
          delivery.status,
          delivery.attempts,
          delivery.nextAttemptAt,
          delivery.lastError,
          delivery.skipReason,
          delivery.providerMessageId,
          delivery.createdAt,
          delivery.settledAt,
          delivery.message && JSON.stringify(delivery.message),
        ],
      );
    }
  }

  async claimDue(input: {
    readonly now: Date;
    readonly leaseUntil: Date;
    readonly limit: number;
  }): Promise<readonly EmailDelivery[]> {
    const claimed = await getPgExecutor(this.pool).query(
      `WITH due AS (
         SELECT id FROM email_outbox
         WHERE status = 'pending' AND next_attempt_at <= $1
         ORDER BY next_attempt_at, id COLLATE "C"
         LIMIT $3
         FOR UPDATE SKIP LOCKED
       )
       UPDATE email_outbox AS outbox
       SET attempts = outbox.attempts + 1, next_attempt_at = $2
       FROM due
       WHERE outbox.id = due.id
       RETURNING ${COLUMNS.split(",")
         .map((column) => `outbox.${column.trim()}`)
         .join(", ")}`,
      [input.now, input.leaseUntil, input.limit],
    );
    return claimed.rows.map((row) => toDelivery(deliveryRowSchema.parse(row))).sort(byDueThenId);
  }

  async pinMessage(id: string, message: EmailMessage): Promise<EmailMessage> {
    const pinned = await getPgExecutor(this.pool).query(
      `UPDATE email_outbox SET message = COALESCE(message, $2::jsonb)
       WHERE id = $1 AND status = $3
       RETURNING message`,
      [id, JSON.stringify(message), EMAIL_DELIVERY_STATUS.pending],
    );
    // A settled or unknown delivery pins nothing; the send then carries the given request.
    if (pinned.rows.length === 0) return message;
    return z.object({ message: messageSchema }).parse(pinned.rows[0]).message;
  }

  async settle(id: string, outcome: EmailDeliveryOutcome): Promise<void> {
    const executor = getPgExecutor(this.pool);
    const pending = EMAIL_DELIVERY_STATUS.pending;
    switch (outcome.kind) {
      case "sent":
        await executor.query(
          `UPDATE email_outbox
           SET status = 'sent', provider_message_id = $2, settled_at = $3
           WHERE id = $1 AND status = $4`,
          [id, outcome.providerMessageId, outcome.at, pending],
        );
        return;
      case "retry":
        await executor.query(
          `UPDATE email_outbox SET last_error = $2, next_attempt_at = $3
           WHERE id = $1 AND status = $4`,
          [id, outcome.error, outcome.nextAttemptAt, pending],
        );
        return;
      case "failed":
        await executor.query(
          `UPDATE email_outbox SET status = 'failed', last_error = $2, settled_at = $3
           WHERE id = $1 AND status = $4`,
          [id, outcome.error, outcome.at, pending],
        );
        return;
      case "skipped":
        await executor.query(
          `UPDATE email_outbox SET status = 'skipped', skip_reason = $2, settled_at = $3
           WHERE id = $1 AND status = $4`,
          [id, outcome.reason, outcome.at, pending],
        );
        return;
    }
  }

  async listByEvent(eventId: string): Promise<readonly EmailDelivery[]> {
    const listed = await getPgExecutor(this.pool).query(
      `SELECT ${COLUMNS} FROM email_outbox WHERE event_id = $1 ORDER BY id COLLATE "C"`,
      [eventId],
    );
    return listed.rows.map((row) => toDelivery(deliveryRowSchema.parse(row)));
  }
}
