import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { Client, Pool, PoolClient } from "pg";
import { authSchema } from "./drizzle-schema.ts";

export type AuthDb = ReturnType<typeof createAuthDb>;

export function createAuthDb(client: Pool | Client | PoolClient) {
  return drizzle(client, { schema: authSchema });
}

const POOL_MAX = 5;

/**
 * One pool for the process. Drizzle checks a client out per query and per
 * transaction, so the advisory lock in actor provisioning stays on one connection.
 */
export function createAuthPool(
  connectionString: string,
  onIdleError: (cause: Error) => void,
): Pool {
  const pool = new pg.Pool({ connectionString, max: POOL_MAX });
  // An idle client that loses its connection emits here; without a listener Node exits.
  pool.on("error", onIdleError);
  return pool;
}
