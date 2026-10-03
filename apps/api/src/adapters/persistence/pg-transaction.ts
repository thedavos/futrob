import { AsyncLocalStorage } from "node:async_hooks";
import type { TransactionPort } from "@futrob/shared-kernel";
import type { Pool, PoolClient } from "pg";
import { logCorrelatedError, logCorrelatedInfo } from "@/context/request-correlation.ts";

const pgTxStorage = new AsyncLocalStorage<PoolClient>();

/** Pool or the request-scoped client when inside `runInTransaction`. */
export type PgExecutor = Pick<Pool, "query">;

export function getPgExecutor(pool: Pool): PgExecutor {
  return pgTxStorage.getStore() ?? pool;
}

export function isInPgTransaction(): boolean {
  return pgTxStorage.getStore() !== undefined;
}

let savepointCounter = 0;

/**
 * Runs `operation` all-or-nothing: inside an outer transaction as a SAVEPOINT, otherwise
 * in a transaction of its own. The scope is rolled back when the operation throws or when
 * `rollbackWhen` accepts its result, so a rejected outcome leaves no trace even though
 * the outer transaction may still commit.
 */
export async function runInPgAtomicScope<T>(
  pool: Pool,
  operation: () => Promise<T>,
  options: { readonly rollbackWhen?: (result: T) => boolean } = {},
): Promise<T> {
  const existing = pgTxStorage.getStore();
  if (existing) {
    const savepoint = `futrob_scope_${++savepointCounter}`;
    await existing.query(`SAVEPOINT ${savepoint}`);
    let result: T;
    try {
      result = await operation();
    } catch (error) {
      await existing.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      await existing.query(`RELEASE SAVEPOINT ${savepoint}`);
      throw error;
    }
    if (options.rollbackWhen?.(result)) {
      await existing.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    }
    await existing.query(`RELEASE SAVEPOINT ${savepoint}`);
    return result;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await pgTxStorage.run(client, operation);
    await client.query(options.rollbackWhen?.(result) ? "ROLLBACK" : "COMMIT");
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
      logCorrelatedInfo("db.transaction.committed");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Prefer the original failure over a secondary rollback error.
      }
      logCorrelatedError("db.transaction.rolled_back", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
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
