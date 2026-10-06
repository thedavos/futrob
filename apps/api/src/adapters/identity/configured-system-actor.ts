import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export async function findProvisionedSystemActor(
  pool: Pool | undefined,
  configuredId: string | undefined,
): Promise<ActorId | null> {
  if (!pool || !configuredId) return null;
  const result = await getPgExecutor(pool).query("SELECT id FROM actors WHERE id = $1", [
    configuredId,
  ]);
  return result.rows.length === 1 ? asActorId(configuredId) : null;
}
