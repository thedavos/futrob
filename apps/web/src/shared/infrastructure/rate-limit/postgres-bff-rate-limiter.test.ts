import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import type { PostgresQueryable, WithPostgres } from "../postgres.ts";
import {
  BFF_RATE_LIMIT_POLICY,
  type BffRateLimitPolicies,
  type RateLimitAttempt,
} from "./bff-rate-limiter.ts";
import { PostgresBffRateLimiter } from "./postgres-bff-rate-limiter.ts";

const TEST_POLICIES: BffRateLimitPolicies = {
  [BFF_RATE_LIMIT_POLICY.eaClubSearch]: {
    windowSeconds: 60,
    actorMaxAttempts: 2,
    ipMaxAttempts: 3,
  },
  [BFF_RATE_LIMIT_POLICY.invitationAccept]: {
    windowSeconds: 900,
    actorMaxAttempts: 1,
    ipMaxAttempts: 1,
  },
  [BFF_RATE_LIMIT_POLICY.invitationPreview]: {
    windowSeconds: 900,
    actorMaxAttempts: 1,
    ipMaxAttempts: 1,
  },
};

function attempt(input: Partial<RateLimitAttempt> = {}): RateLimitAttempt {
  return {
    policy: input.policy ?? BFF_RATE_LIMIT_POLICY.eaClubSearch,
    actorId: input.actorId ?? asActorId("actor-1"),
    ipFingerprint: input.ipFingerprint ?? "1".repeat(64),
    nowMs: input.nowMs ?? 12_345,
  };
}

describe("PostgresBffRateLimiter transaction", () => {
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
    const limiter = new PostgresBffRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
    });

    await expect(limiter.check(attempt())).resolves.toEqual({ outcome: "allowed" });
    expect(statements).toEqual(["BEGIN", "DELETE", "INSERT", "INSERT", "COMMIT"]);
  });

  it("rolls back and rethrows when a statement fails", async () => {
    const { statements, withPostgres } = scriptedClient(/INSERT/);
    const limiter = new PostgresBffRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies: TEST_POLICIES,
    });

    await expect(limiter.check(attempt())).rejects.toThrow("boom");
    expect(statements).toEqual(["BEGIN", "DELETE", "INSERT", "ROLLBACK"]);
  });

  it("rejects an IP fingerprint that is not a SHA-256 digest", async () => {
    const { statements, withPostgres } = scriptedClient();
    const limiter = new PostgresBffRateLimiter({
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

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];

suite("PostgresBffRateLimiter on Postgres (migration 0043)", () => {
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

  it("removes stale windows before counting", async () => {
    const { limiter, query } = await createLimiter();
    await query(
      `INSERT INTO app_rate_limit_windows
        (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
       VALUES ($1, 'actor', $2, 0, 1)`,
      [BFF_RATE_LIMIT_POLICY.eaClubSearch, "a".repeat(64)],
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
      [BFF_RATE_LIMIT_POLICY.invitationAccept]: {
        windowSeconds: 901,
        actorMaxAttempts: 1,
        ipMaxAttempts: 1,
      },
    });
    await query(
      `INSERT INTO app_rate_limit_windows
        (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
       VALUES ($1, 'ip', $2, 1800000, 2)`,
      [BFF_RATE_LIMIT_POLICY.eaClubSearch, "1".repeat(64)],
    );

    await limiter.check(attempt({ nowMs: 1_805_000 }));

    const row = await query(
      `SELECT request_count FROM app_rate_limit_windows
       WHERE policy = $1 AND subject_kind = 'ip' AND subject_fingerprint = $2
         AND window_started_at = 1800000`,
      [BFF_RATE_LIMIT_POLICY.eaClubSearch, "1".repeat(64)],
    );
    expect(row.rows).toEqual([{ request_count: 3 }]);
  });

  it("atomically counts concurrent attempts without storing actor or IP subjects", async () => {
    const { limiter, query } = await createLimiter({
      ...TEST_POLICIES,
      [BFF_RATE_LIMIT_POLICY.eaClubSearch]: {
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

/** Fresh schema per test; each check gets its own connection, like a Worker request. */
async function createLimiter(policies: BffRateLimitPolicies = TEST_POLICIES) {
  const schema = `bff_rate_limit_${randomUUID().replaceAll("-", "")}`;
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
      return await run(client);
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
      new URL("../../../../../api/migrations/0043_auth_and_actors.sql", import.meta.url),
      "utf8",
    ),
  );
  await setup.end();

  return {
    limiter: new PostgresBffRateLimiter({
      withPostgres,
      fingerprintSecret: "dedicated-test-secret",
      policies,
    }),
    query: (text: string, values?: readonly unknown[]) =>
      withPostgres((c) => c.query(text, values)),
  };
}
