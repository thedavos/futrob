import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { authSchema } from "./drizzle-schema.ts";

export type AuthDb = ReturnType<typeof createAuthDb>;

export function createAuthDb(client: Client) {
  return drizzle(client, { schema: authSchema });
}

export interface AuthDatabaseConnection {
  readonly client: Client;
  readonly db: AuthDb;
  close(): Promise<void>;
}

/**
 * One connection per request. Hyperdrive owns pooling, so a Worker must not
 * keep a `pg` client across requests; close it once the response is built.
 */
export async function connectAuthDatabase(
  connectionString: string,
): Promise<AuthDatabaseConnection> {
  const client = new Client({ connectionString });
  await client.connect();
  return {
    client,
    db: createAuthDb(client),
    close: async () => {
      await client.end().catch(() => undefined);
    },
  };
}
