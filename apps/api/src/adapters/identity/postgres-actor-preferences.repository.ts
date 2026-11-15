import {
  SIDEBAR_LAYOUTS,
  type ActorPreferences,
  type ActorPreferencesPort,
  type ActorPreferencesUpdate,
} from "@futrob/identity";
import type { ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const actorPreferencesRowSchema = z.object({
  sidebar_layout: z.enum(SIDEBAR_LAYOUTS),
});

export class PostgresActorPreferencesRepository implements ActorPreferencesPort {
  constructor(private readonly pool: Pool) {}

  async findByActor(actorId: ActorId): Promise<ActorPreferences | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT sidebar_layout FROM actor_preferences WHERE actor_id = $1`,
      [actorId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { sidebarLayout: actorPreferencesRowSchema.parse(row).sidebar_layout };
  }

  async save(update: ActorPreferencesUpdate): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO actor_preferences (actor_id, sidebar_layout, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (actor_id) DO UPDATE
       SET sidebar_layout = EXCLUDED.sidebar_layout, updated_at = EXCLUDED.updated_at`,
      [update.actorId, update.sidebarLayout, update.updatedAt],
    );
  }
}
