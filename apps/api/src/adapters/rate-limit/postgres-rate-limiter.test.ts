import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg, { Client } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { RATE_LIMIT_POLICY } from "@futrob/api-contracts";
import type { Pool, PoolClient } from "pg";
import {
  PostgresRateLimiter,
  postgresQueryable,
  withPoolConnection,
  type PostgresQueryable,
  type WithPostgres,
} from "./postgres-rate-limiter.ts";
import { createRateLimitPostgresPool } from "../persistence/postgres.ts";
import type { RateLimitAttempt, RateLimitPolicies } from "./rate-limit-policies.ts";

const TEST_POLICIES: RateLimitPolicies = {
  [RATE_LIMIT_POLICY.eaClubSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 2,
    ipMaxAttempts: 3,
  },
  [RATE_LIMIT_POLICY.invitationAccept]: {
    windowSeconds: 900,
    actorMaxAttempts: 1,
    ipMaxAttempts: 1,
  },
  [RATE_LIMIT_POLICY.invitationPreview]: {
    windowSeconds: 900,
    actorMaxAttempts: 1,
    ipMaxAttempts: 1,
  },
  [RATE_LIMIT_POLICY.invitationPublicPreview]: {
    windowSeconds: 900,
    actorMaxAttempts: 1,
    ipMaxAttempts: 2,
  },
  [RATE_LIMIT_POLICY.playerSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 1,
    ipMaxAttempts: 1,
  },
  [RATE_LIMIT_POLICY.publicClubSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 1,
    ipMaxAttempts: 1,
  },
  [RATE_LIMIT_POLICY.publicCompetitionExplore]: {
    windowSeconds: 60,
    actorMaxAttempts: 1,
    ipMaxAttempts: 1,
  },
};

function attempt(input: Partial<RateLimitAttempt> = {}): RateLimitAttempt {
  return {
    policy: input.policy ?? RATE_LIMIT_POLICY.eaClubSearch,
    actorId: input.actorId === undefined ? asActorId("actor-1") : input.actorId,
    ipFingerprint: input.ipFingerprint ?? "1".repeat(64),
    nowMs: input.nowMs ?? 12_345,
  };
}

describe("PostgresRateLimiter transaction", () => {
  function scriptedClient(failOn?: RegExp) {
    const statements: string[] = [];
    const client: PostgresQueryable = {
      async query(text) {
        const statement = text.trim().split(/\s+/)[0] ?? "";
        statements.push(statement);
        if (failOn?.test(text)) throw new Error("boom");
        return { rows: statement === "INSERT" ? [{ request_count: 1 }] : [] };
      },
    };
    const withPostgres: WithPostgres = (run) => run(client);
    return { statements, withPostgres };
  }

  it("purges and counts the actor and IP windows in one transaction", async () => {
    const { statements, withPostgres } = scriptedClient();
    const limiter = new PostgresRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
    });

    await expect(limiter.check(attempt())).resolves.toEqual({ outcome: "allowed" });
    expect(statements).toEqual(["BEGIN", "SET", "DELETE", "INSERT", "INSERT", "COMMIT"]);
  });

  it("counts only the IP window for a signed-out attempt", async () => {
    const { statements, withPostgres } = scriptedClient();
    const limiter = new PostgresRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
    });

    await expect(limiter.check(attempt({ actorId: null }))).resolves.toEqual({
      outcome: "allowed",
    });
    expect(statements).toEqual(["BEGIN", "SET", "DELETE", "INSERT", "COMMIT"]);
  });

  it("reports a failed rollback without a SQLSTATE, so the pool destroys the connection", async () => {
    const statements: string[] = [];
    const client: PostgresQueryable = {
      async query(text) {
        const statement = text.trim().split(/\s+/)[0] ?? "";
        statements.push(statement);
        if (statement === "INSERT" || statement === "ROLLBACK") {
          throw Object.assign(new Error("server gone"), { code: "57P01" });
        }
        return { rows: [] };
      },
    };
    const limiter = new PostgresRateLimiter({
      withPostgres: (run) => run(client),
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
    });

    const failure = await limiter.check(attempt()).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toHaveProperty("code");
    expect(statements.at(-1)).toBe("ROLLBACK");
  });

  it("gives each statement what is left of the budget, so a slow COMMIT can use it", async () => {
    let now = 0;
    const timeouts: string[] = [];
    const client: PostgresQueryable = {
      async query(text, _values, options) {
        const statement = text.trim().split(/\s+/)[0] ?? "";
        timeouts.push(`${statement} ${options?.timeoutMs}`);
        now += 100;
        return { rows: statement === "INSERT" ? [{ request_count: 1 }] : [] };
      },
    };
    const limiter = new PostgresRateLimiter({
      withPostgres: (run) => run(client),
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
      budgetMs: 2_500,
      monotonicNow: () => now,
    });

    await expect(limiter.check(attempt())).resolves.toEqual({ outcome: "allowed" });
    expect(timeouts).toEqual([
      "BEGIN 2500",
      "SET 2400",
      "DELETE 2300",
      "INSERT 2200",
      "INSERT 2100",
      "COMMIT 2000",
    ]);
  });

  it("fails closed without sending COMMIT once the budget is spent", async () => {
    let now = 0;
    const statements: string[] = [];
    const client: PostgresQueryable = {
      async query(text) {
        const statement = text.trim().split(/\s+/)[0] ?? "";
        statements.push(statement);
        now += statement === "INSERT" ? 1_300 : 0;
        return { rows: statement === "INSERT" ? [{ request_count: 1 }] : [] };
      },
    };
    const limiter = new PostgresRateLimiter({
      withPostgres: (run) => run(client),
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
      budgetMs: 2_500,
      monotonicNow: () => now,
    });

    await expect(limiter.check(attempt())).rejects.toThrow("ran out of time");
    expect(statements).toEqual(["BEGIN", "SET", "DELETE", "INSERT", "INSERT", "ROLLBACK"]);
  });

  it("rolls back and rethrows when a statement fails", async () => {
    const { statements, withPostgres } = scriptedClient(/INSERT/);
    const limiter = new PostgresRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
    });

    await expect(limiter.check(attempt())).rejects.toThrow("boom");
    expect(statements).toEqual(["BEGIN", "SET", "DELETE", "INSERT", "ROLLBACK"]);
  });

  it("rejects an IP fingerprint that is not a SHA-256 digest", async () => {
    const { statements, withPostgres } = scriptedClient();
    const limiter = new PostgresRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
    });

    await expect(limiter.check(attempt({ ipFingerprint: "203.0.113.9" }))).rejects.toThrow(
      "SHA-256",
    );
    expect(statements).toEqual([]);
  });
});

describe("withPoolConnection", () => {
  function fakePool() {
    const releases: unknown[] = [];
    const client = {
      query: async () => ({ rows: [] }),
      release: (error?: unknown) => {
        releases.push(error);
      },
    };
    // Only `connect` and the client's `query`/`release` are used.
    const pool = { connect: async () => client as unknown as PoolClient } as unknown as Pool;
    return { pool, releases };
  }

  it("returns the connection to the pool after a successful check", async () => {
    const { pool, releases } = fakePool();

    await expect(withPoolConnection(pool)(async () => "done")).resolves.toBe("done");
    expect(releases).toEqual([undefined]);
  });

  it("returns the connection after a Postgres error, which was rolled back", async () => {
    const { pool, releases } = fakePool();
    const lockTimeout = Object.assign(new Error("lock timeout"), { code: "55P03" });

    await expect(
      withPoolConnection(pool)(async () => {
        throw lockTimeout;
      }),
    ).rejects.toBe(lockTimeout);
    expect(releases).toEqual([undefined]);
  });

  it("destroys the connection after any other failure, in case its transaction is open", async () => {
    const { pool, releases } = fakePool();
    const failure = new Error("connection terminated");

    await expect(
      withPoolConnection(pool)(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(releases).toEqual([failure]);
  });
});

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];

suite("PostgresRateLimiter on Postgres (migration 0043)", () => {
  afterEach(async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      for (const schema of schemas.splice(0)) {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
    } finally {
      await client.end();
    }
  });

  it("allows the first attempt", async () => {
    const { limiter } = await createLimiter();
    await expect(limiter.check(attempt())).resolves.toEqual({ outcome: "allowed" });
  });

  it("limits actor attempts once the actor window is full", async () => {
    const { limiter } = await createLimiter();
    await limiter.check(attempt());
    await limiter.check(attempt());

    await expect(limiter.check(attempt())).resolves.toEqual({
      outcome: "limited",
      limitedBy: "actor",
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("limits signed-out attempts by IP alone", async () => {
    const { limiter } = await createLimiter();
    const anonymous = attempt({
      actorId: null,
      policy: RATE_LIMIT_POLICY.invitationPublicPreview,
    });
    await limiter.check(anonymous);
    await limiter.check(anonymous);

    await expect(limiter.check(anonymous)).resolves.toEqual({
      outcome: "limited",
      limitedBy: "ip",
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("removes stale windows before counting", async () => {
    const { limiter, query } = await createLimiter();
    await query(
      `INSERT INTO app_rate_limit_windows
        (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
       VALUES ($1, 'actor', $2, 0, 1)`,
      [RATE_LIMIT_POLICY.eaClubSearch, "a".repeat(64)],
    );

    await limiter.check(attempt({ nowMs: 1_800_000 }));

    const stale = await query(
      "SELECT COUNT(*)::int AS count FROM app_rate_limit_windows WHERE window_started_at = 0",
    );
    expect(stale.rows).toEqual([{ count: 0 }]);
  });

  it("retains active short-policy windows when policy lengths do not divide evenly", async () => {
    const { limiter, query } = await createLimiter({
      ...TEST_POLICIES,
      [RATE_LIMIT_POLICY.invitationAccept]: {
        windowSeconds: 901,
        actorMaxAttempts: 1,
        ipMaxAttempts: 1,
      },
    });
    await query(
      `INSERT INTO app_rate_limit_windows
        (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
       VALUES ($1, 'ip', $2, 1800000, 2)`,
      [RATE_LIMIT_POLICY.eaClubSearch, "1".repeat(64)],
    );

    await limiter.check(attempt({ nowMs: 1_805_000 }));

    const row = await query(
      `SELECT request_count FROM app_rate_limit_windows
       WHERE policy = $1 AND subject_kind = 'ip' AND subject_fingerprint = $2
         AND window_started_at = 1800000`,
      [RATE_LIMIT_POLICY.eaClubSearch, "1".repeat(64)],
    );
    expect(row.rows).toEqual([{ request_count: 3 }]);
  });

  it("skips an expired window another check is purging instead of waiting on it", async () => {
    const { limiter, query, connect } = await createLimiter();
    const expired = [RATE_LIMIT_POLICY.eaClubSearch, "ip", "9".repeat(64)];
    await query(
      `INSERT INTO app_rate_limit_windows
        (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
       VALUES ($1, $2, $3, 0, 1)`,
      expired,
    );
    const concurrentPurge = await connect();
    try {
      await concurrentPurge.query("BEGIN");
      await concurrentPurge.query(
        `SELECT 1 FROM app_rate_limit_windows
         WHERE policy = $1 AND subject_kind = $2 AND subject_fingerprint = $3
         FOR UPDATE`,
        expired,
      );

      const decision = await limiter.check(attempt({ nowMs: 10_000_000 }));
      await concurrentPurge.query("ROLLBACK");

      expect(decision).toEqual({ outcome: "allowed" });
      const remaining = await query(
        "SELECT subject_fingerprint FROM app_rate_limit_windows WHERE window_started_at = 0",
      );
      expect(remaining.rows).toEqual([{ subject_fingerprint: "9".repeat(64) }]);
    } finally {
      await concurrentPurge.end();
    }
  });

  it("gives up with a lock timeout instead of queueing behind a held counter row", async () => {
    const { limiter, connect } = await createLimiter(TEST_POLICIES, { lockTimeoutMs: 50 });
    await limiter.check(attempt({ actorId: null }));
    const holder = await connect();
    try {
      await holder.query("BEGIN");
      await holder.query(
        "SELECT 1 FROM app_rate_limit_windows WHERE subject_kind = 'ip' FOR UPDATE",
      );

      await expect(limiter.check(attempt({ actorId: null }))).rejects.toMatchObject({
        code: "55P03",
      });
    } finally {
      await holder.query("ROLLBACK");
      await holder.end();
    }
  });

  it("fails a burst of checks on a held counter without taking the product pool", async () => {
    const { schema, connect } = await createLimiter();
    const rateLimitPool = createRateLimitPostgresPool({
      databaseUrl,
      onIdleError: () => undefined,
      limits: {
        max: 1,
        connectionTimeoutMillis: 200,
        statementTimeoutMillis: 2_000,
        idleTimeoutMillis: 10_000,
      },
      options: `-c search_path=${schema}`,
    });
    const productPool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
    if (!rateLimitPool) throw new Error("TEST_DATABASE_URL is required");
    const limiter = new PostgresRateLimiter({
      withPostgres: withPoolConnection(rateLimitPool),
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
      lockTimeoutMs: 200,
    });
    await limiter.check(attempt({ actorId: null }));
    const holder = await connect();
    try {
      await holder.query("BEGIN");
      await holder.query(
        "SELECT 1 FROM app_rate_limit_windows WHERE subject_kind = 'ip' FOR UPDATE",
      );

      const finished: string[] = [];
      const burst = Promise.allSettled(
        Array.from({ length: 3 }, () =>
          limiter.check(attempt({ actorId: null })).finally(() => finished.push("check")),
        ),
      );
      const product = await productPool
        .query("SELECT 1 AS ok")
        .finally(() => finished.push("product"));
      const outcomes = await burst;

      // The product query does not wait for any check to give up.
      expect(product.rows).toEqual([{ ok: 1 }]);
      expect(finished[0]).toBe("product");
      expect(outcomes.map((outcome) => outcome.status)).toEqual([
        "rejected",
        "rejected",
        "rejected",
      ]);
    } finally {
      await holder.query("ROLLBACK");
      await holder.end();
      await rateLimitPool.end();
      await productPool.end();
    }
  });

  it("waits for a COMMIT slower than one statement and counts the attempt once", async () => {
    const { limiter, query } = await createLimiter();
    // Delays only the COMMIT reply: a deferred trigger runs while the transaction commits.
    await query(`
      CREATE FUNCTION slow_commit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN PERFORM pg_sleep(0.9); RETURN NULL; END $$;
      CREATE CONSTRAINT TRIGGER slow_commit AFTER INSERT OR UPDATE ON app_rate_limit_windows
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
        WHEN (NEW.subject_kind = 'ip') EXECUTE FUNCTION slow_commit();
    `);

    const decision = await limiter.check(attempt({ actorId: null }));

    expect(decision).toEqual({ outcome: "allowed" });
    const rows = await query("SELECT request_count FROM app_rate_limit_windows");
    expect(rows.rows).toEqual([{ request_count: 1 }]);
  });

  it("atomically counts concurrent attempts without storing actor or IP subjects", async () => {
    const { limiter, query } = await createLimiter({
      ...TEST_POLICIES,
      [RATE_LIMIT_POLICY.eaClubSearch]: {
        windowSeconds: 60,
        actorMaxAttempts: 10,
        ipMaxAttempts: 100,
      },
    });

    const decisions = await Promise.all(
      Array.from({ length: 20 }, () =>
        limiter.check(attempt({ actorId: asActorId("sensitive-actor") })),
      ),
    );
    const rows = (
      await query(
        "SELECT subject_fingerprint, request_count FROM app_rate_limit_windows ORDER BY subject_kind",
      )
    ).rows as { subject_fingerprint: string; request_count: number }[];

    expect(decisions.filter((decision) => decision.outcome === "allowed")).toHaveLength(10);
    expect(decisions.filter((decision) => decision.outcome === "limited")).toHaveLength(10);
    expect(rows.map((row) => row.request_count)).toEqual([20, 20]);
    expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.subject_fingerprint))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("sensitive-actor");
  });
});

/** Fresh schema per test; each check gets its own connection, like a pooled checkout. */
async function createLimiter(
  policies: RateLimitPolicies = TEST_POLICIES,
  options: Readonly<{ lockTimeoutMs?: number }> = {},
) {
  const schema = `rate_limit_${randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);

  const connect = async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(`SET search_path TO "${schema}"`);
    return client;
  };
  const withPostgres: WithPostgres = async (run) => {
    const client = await connect();
    try {
      return await run(postgresQueryable(client));
    } finally {
      await client.end();
    }
  };

  const bootstrap = new Client({ connectionString: databaseUrl });
  await bootstrap.connect();
  await bootstrap.query(`CREATE SCHEMA "${schema}"`);
  await bootstrap.end();
  const setup = await connect();
  await setup.query(
    await readFile(
      new URL("../../../migrations/0043_auth_and_actors.sql", import.meta.url),
      "utf8",
    ),
  );
  await setup.end();

  return {
    limiter: new PostgresRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies,
      lockTimeoutMs: options.lockTimeoutMs,
    }),
    schema,
    query: (text: string, values?: readonly unknown[]) =>
      withPostgres((c) => c.query(text, values)),
    connect,
  };
}
