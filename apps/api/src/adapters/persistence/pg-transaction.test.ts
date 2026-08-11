import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { Pool, PoolClient } from "pg";
import {
  createRequestCorrelation,
  runWithRequestCorrelation,
  type CorrelationLogEntry,
} from "@/context/request-correlation.ts";
import {
  getPgExecutor,
  isInPgTransaction,
  NoopTransactionPort,
  PostgresTransactionPort,
} from "./pg-transaction.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

function createFakePool(client: ReturnType<typeof createFakeClient>) {
  return {
    connect: vi.fn<() => Promise<PoolClient>>(async () => client as unknown as PoolClient),
    query: vi.fn(),
  };
}

function createFakeClient() {
  const queries: string[] = [];
  return {
    queries,
    query: vi.fn(async (text: string) => {
      queries.push(text);
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn<() => void>(),
  };
}

describe("PostgresTransactionPort", () => {
  it("commits when the operation succeeds", async () => {
    const client = createFakeClient();
    const pool = createFakePool(client);
    const port = new PostgresTransactionPort(pool as unknown as Pool);

    const value = await port.runInTransaction(async () => {
      expect(isInPgTransaction()).toBe(true);
      await getPgExecutor(pool as unknown as Pool).query("SELECT 1");
      return 42;
    });

    expect(value).toBe(42);
    expect(client.queries).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
    expect(isInPgTransaction()).toBe(false);
  });

  it("logs a committed transaction with the active request ID", async () => {
    const client = createFakeClient();
    const pool = createFakePool(client);
    const port = new PostgresTransactionPort(pool as unknown as Pool);
    const entries: CorrelationLogEntry[] = [];
    const requestId = "c67ed142-17da-4dc1-9239-1671fb10adbb";

    await runWithRequestCorrelation(
      createRequestCorrelation(requestId),
      { info: (entry) => entries.push(entry), error: (entry) => entries.push(entry) },
      () => port.runInTransaction(async () => undefined),
    );

    expect(entries).toContainEqual({ event: "db.transaction.committed", requestId });
  });

  it("rolls back when the operation throws", async () => {
    const client = createFakeClient();
    const pool = createFakePool(client);
    const port = new PostgresTransactionPort(pool as unknown as Pool);

    await expect(
      port.runInTransaction(async () => {
        await getPgExecutor(pool as unknown as Pool).query("INSERT INTO x DEFAULT VALUES");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(client.queries).toEqual(["BEGIN", "INSERT INTO x DEFAULT VALUES", "ROLLBACK"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("reuses the outer client for nested runInTransaction calls", async () => {
    const client = createFakeClient();
    const pool = createFakePool(client);
    const port = new PostgresTransactionPort(pool as unknown as Pool);

    await port.runInTransaction(async () => {
      await port.runInTransaction(async () => {
        await getPgExecutor(pool as unknown as Pool).query("SELECT nested");
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
