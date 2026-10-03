import { Client } from "pg";

/** Minimal Hyperdrive surface (avoids depending on wrangler typegen). */
export interface HyperdriveBinding {
  readonly connectionString: string;
}

export interface PostgresQueryResult {
  readonly rows: readonly unknown[];
}

export interface PostgresQueryable {
  query(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult>;
}

/** Runs `run` on one connection and always releases it. */
export type WithPostgres = <T>(run: (client: PostgresQueryable) => Promise<T>) => Promise<T>;

/**
 * Product Postgres through Hyperdrive (ADR-0021). Hyperdrive owns pooling, so a
 * Worker opens one short-lived `pg` connection per unit of work and never keeps
 * it across requests.
 */
export function createHyperdriveConnector(binding: HyperdriveBinding): WithPostgres {
  return async (run) => {
    const client = new Client({ connectionString: binding.connectionString });
    await client.connect();
    try {
      return await run(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  };
}
