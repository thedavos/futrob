import type { ActorContact, ActorContactReader } from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export const ACTOR_CONTACT_PROFILE_LIST_SQL = `SELECT actor_id, display_name, email
       FROM actor_contact_profiles
       WHERE actor_id = ANY($1::text[])`;

const contactRowSchema = z.object({
  actor_id: pgTextSchema,
  display_name: pgTextSchema,
  email: pgTextSchema,
});

export class PostgresActorContactReader implements ActorContactReader {
  constructor(private readonly pool: Pool) {}

  async listByActorIds(actorIds: readonly ActorId[]): Promise<readonly ActorContact[]> {
    if (actorIds.length === 0) return [];
    const result = await getPgExecutor(this.pool).query(ACTOR_CONTACT_PROFILE_LIST_SQL, [
      [...actorIds],
    ]);
    return result.rows.map((row) => {
      const parsed = contactRowSchema.parse(row);
      return {
        actorId: asActorId(parsed.actor_id),
        displayName: parsed.display_name,
        email: parsed.email,
      };
    });
  }
}

export class InMemoryActorContactReader implements ActorContactReader {
  readonly rows = new Map<ActorId, ActorContact>();

  async listByActorIds(actorIds: readonly ActorId[]): Promise<readonly ActorContact[]> {
    if (actorIds.length === 0) return [];
    const wanted = new Set(actorIds);
    return [...this.rows.values()].filter((row) => wanted.has(row.actorId));
  }
}
