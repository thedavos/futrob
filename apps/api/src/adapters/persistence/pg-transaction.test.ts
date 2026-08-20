import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  asPgPool,
  createFakePgClient,
  type FakePgPool,
} from "@/adapters/persistence/pg-test-double.ts";
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

function createTestSetup() {
  const release = vi.fn<() => void>();
  const client = createFakePgClient();
  const connect = vi.fn(async () => ({ ...client, release }));
  const fakePool: FakePgPool = { connect, query: client.query };
  return { client, pool: asPgPool(fakePool), connect, release };
}

describe("PostgresTransactionPort", () => {
  it("commits when the operation succeeds", async () => {
    const { client, pool, release } = createTestSetup();
    const port = new PostgresTransactionPort(pool);

    const value = await port.runInTransaction(async () => {
      expect(isInPgTransaction()).toBe(true);
      await getPgExecutor(pool).query("SELECT 1");
      return 42;
    });

    expect(value).toBe(42);
    expect(client.queries).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
    expect(release).toHaveBeenCalledOnce();
    expect(isInPgTransaction()).toBe(false);
  });

  it("logs a committed transaction with the active request ID", async () => {
    const { pool } = createTestSetup();
    const port = new PostgresTransactionPort(pool);
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
    const { client, pool, release } = createTestSetup();
    const port = new PostgresTransactionPort(pool);

    await expect(
      port.runInTransaction(async () => {
        await getPgExecutor(pool).query("INSERT INTO x DEFAULT VALUES");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(client.queries).toEqual(["BEGIN", "INSERT INTO x DEFAULT VALUES", "ROLLBACK"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("reuses the outer client for nested runInTransaction calls", async () => {
    const { client, pool, connect } = createTestSetup();
    const port = new PostgresTransactionPort(pool);

    await port.runInTransaction(async () => {
      await port.runInTransaction(async () => {
        await getPgExecutor(pool).query("SELECT nested");
      });
    });

    expect(connect).toHaveBeenCalledOnce();
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
