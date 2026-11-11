import type { ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

/**
 * Reaction to `identity.actor-deleted`: personal statistics go. Competition statistics
 * projected from official results stay, attached to the anonymous player profile.
 */
export async function removeDeletedActorPersonalStats(pool: Pool, actorId: ActorId): Promise<void> {
  await getPgExecutor(pool).query(
    `DELETE FROM player_personal_stats
     WHERE player_profile_id IN (SELECT id FROM player_profiles WHERE actor_id = $1)`,
    [actorId],
  );
}
