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
  runInPgAtomicScope,
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

describe("runInPgAtomicScope", () => {
  it("opens its own transaction outside one and commits an accepted result", async () => {
    const { client, pool, release } = createTestSetup();

    const value = await runInPgAtomicScope(pool, async () => {
      expect(isInPgTransaction()).toBe(true);
      await getPgExecutor(pool).query("SELECT 1");
      return "ok";
    });

    expect(value).toBe("ok");
    expect(client.queries).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls its own transaction back for a rejected result and for a throw", async () => {
    const { client, pool } = createTestSetup();

    await runInPgAtomicScope(pool, async () => "rejected", {
      rollbackWhen: (result) => result === "rejected",
    });
    await expect(
      runInPgAtomicScope(pool, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(client.queries).toEqual(["BEGIN", "ROLLBACK", "BEGIN", "ROLLBACK"]);
  });

  it("uses a savepoint inside an outer transaction and keeps the outer one open", async () => {
    const { client, pool, connect } = createTestSetup();
    const port = new PostgresTransactionPort(pool);

    await port.runInTransaction(async () => {
      await runInPgAtomicScope(pool, async () => getPgExecutor(pool).query("SELECT kept"));
      await runInPgAtomicScope(pool, async () => "rejected", {
        rollbackWhen: () => true,
      });
      await expect(
        runInPgAtomicScope(pool, async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });

    expect(connect).toHaveBeenCalledOnce();
    expect(client.queries.map((query) => query.replace(/\d+/g, "n"))).toEqual([
      "BEGIN",
      "SAVEPOINT futrob_scope_n",
      "SELECT kept",
      "RELEASE SAVEPOINT futrob_scope_n",
      "SAVEPOINT futrob_scope_n",
      "ROLLBACK TO SAVEPOINT futrob_scope_n",
      "RELEASE SAVEPOINT futrob_scope_n",
      "SAVEPOINT futrob_scope_n",
      "ROLLBACK TO SAVEPOINT futrob_scope_n",
      "RELEASE SAVEPOINT futrob_scope_n",
      "COMMIT",
    ]);
  });
});

describe("NoopTransactionPort", () => {
  it("runs the callback without a postgres client", async () => {
    const port = new NoopTransactionPort();
    await expect(port.runInTransaction(async () => "ok")).resolves.toBe("ok");
    expect(isInPgTransaction()).toBe(false);
  });
});
