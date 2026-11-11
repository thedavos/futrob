import type { ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

/**
 * Reaction to `identity.actor-deleted`: the actor loses competition roles and pending
 * directed entry invitations. Finished competitions keep their history.
 */
export async function removeDeletedActorFromCompetitions(
  pool: Pool,
  actorId: ActorId,
  at: Date,
): Promise<void> {
  const db = getPgExecutor(pool);
  await db.query(
    `DELETE FROM competition_memberships membership
     USING competitions competition
     WHERE membership.actor_id = $1 AND competition.id = membership.competition_id
       AND competition.status NOT IN ('finished', 'archived')`,
    [actorId],
  );
  await db.query(
    `UPDATE competition_entry_invitations SET status = 'revoked', responded_at = $2
     WHERE invitee_actor_id = $1 AND status = 'pending'`,
    [actorId, at],
  );
}
