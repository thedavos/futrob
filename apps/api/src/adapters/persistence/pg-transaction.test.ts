import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Pool, PoolClient } from "pg";
import {
  getPgExecutor,
  isInPgTransaction,
  NoopTransactionPort,
  PostgresTransactionPort,
} from "./pg-transaction.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

function createFakePool(client: PoolClient): Pool {
  return {
    connect: vi.fn(async () => client),
    query: vi.fn(),
  } as unknown as Pool;
}

function createFakeClient(): PoolClient & { queries: string[] } {
  const queries: string[] = [];
  return {
    queries,
    query: vi.fn(async (text: string) => {
      queries.push(text);
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  } as unknown as PoolClient & { queries: string[] };
}

describe("PostgresTransactionPort", () => {
  it("commits when the operation succeeds", async () => {
    const client = createFakeClient();
    const pool = createFakePool(client);
    const port = new PostgresTransactionPort(pool);

    const value = await port.runInTransaction(async () => {
      expect(isInPgTransaction()).toBe(true);
      await getPgExecutor(pool).query("SELECT 1");
      return 42;
    });

    expect(value).toBe(42);
    expect(client.queries).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
    expect(isInPgTransaction()).toBe(false);
  });

  it("rolls back when the operation throws", async () => {
    const client = createFakeClient();
    const pool = createFakePool(client);
    const port = new PostgresTransactionPort(pool);

    await expect(
      port.runInTransaction(async () => {
        await getPgExecutor(pool).query("INSERT INTO x DEFAULT VALUES");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(client.queries).toEqual(["BEGIN", "INSERT INTO x DEFAULT VALUES", "ROLLBACK"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("reuses the outer client for nested runInTransaction calls", async () => {
    const client = createFakeClient();
    const pool = createFakePool(client);
    const port = new PostgresTransactionPort(pool);

    await port.runInTransaction(async () => {
      await port.runInTransaction(async () => {
        await getPgExecutor(pool).query("SELECT nested");
      });
    });

    expect(pool.connect).toHaveBeenCalledOnce();
    expect(client.queries).toEqual(["BEGIN", "SELECT nested", "COMMIT"]);
  });
});

describe("NoopTransactionPort", () => {
  it("runs the callback without a postgres client", async () => {
    const port = new NoopTransactionPort();
    await expect(port.runInTransaction(async () => "ok")).resolves.toBe("ok");
    expect(isInPgTransaction()).toBe(false);
  });
});
