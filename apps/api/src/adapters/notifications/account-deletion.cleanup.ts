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
