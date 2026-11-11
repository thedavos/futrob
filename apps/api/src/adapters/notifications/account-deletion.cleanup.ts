import type { ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

/** Reaction to `identity.actor-deleted`: activity addressed to the actor closes. */
export async function closeDeletedActorActivity(
  pool: Pool,
  actorId: ActorId,
  at: Date,
): Promise<void> {
  await getPgExecutor(pool).query(
    `UPDATE activity_entries
     SET status = 'closed', closed_at = $2, last_event_at = $2, closed_by_actor_id = $1
     WHERE audience = 'actor' AND audience_id = $1 AND status = 'open'`,
    [actorId, at],
  );
}

/**
 * Reaction to `identity.actor-deleted` (ADR-0030): the actors row stays as a tombstone, so its
 * cascades never reach the email channel. Pending email to the actor settles as having no
 * address, every stored request (address, name, body) and provider error goes, and the
 * preferences row with its unsubscribe token is removed.
 */
export async function retireDeletedActorEmail(
  pool: Pool,
  actorId: ActorId,
  at: Date,
): Promise<void> {
  const executor = getPgExecutor(pool);
  await executor.query(
    `UPDATE email_outbox
     SET status = 'skipped', skip_reason = 'no_address', settled_at = $2
     WHERE recipient_actor_id = $1 AND status = 'pending'`,
    [actorId, at],
  );
  await executor.query(
    `UPDATE email_outbox SET message = NULL, last_error = NULL
     WHERE recipient_actor_id = $1 AND (message IS NOT NULL OR last_error IS NOT NULL)`,
    [actorId],
  );
  await executor.query(`DELETE FROM notification_email_preferences WHERE actor_id = $1`, [actorId]);
}
