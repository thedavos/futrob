import { AsyncLocalStorage } from "node:async_hooks";
import type { TransactionPort } from "@futrob/shared-kernel";
import type { Pool, PoolClient } from "pg";

const pgTxStorage = new AsyncLocalStorage<PoolClient>();

/** Pool or the request-scoped client when inside `runInTransaction`. */
export type PgExecutor = Pick<Pool, "query">;

export function getPgExecutor(pool: Pool): PgExecutor {
  return pgTxStorage.getStore() ?? pool;
}

export function isInPgTransaction(): boolean {
  return pgTxStorage.getStore() !== undefined;
}

export class PostgresTransactionPort implements TransactionPort {
  constructor(private readonly pool: Pool) {}

  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const existing = pgTxStorage.getStore();
    if (existing) {
      return operation();
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await pgTxStorage.run(client, operation);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Prefer the original failure over a secondary rollback error.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

export class NoopTransactionPort implements TransactionPort {
  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

export function createTransactionPort(pool: Pool | undefined): TransactionPort {
  return pool ? new PostgresTransactionPort(pool) : new NoopTransactionPort();
}
