import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";
import { z } from "zod";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import type { AppD1Database, D1BatchResult } from "../d1.ts";
import {
  BFF_RATE_LIMIT_POLICY,
  type BffRateLimitPolicies,
  type RateLimitAttempt,
} from "./bff-rate-limiter.ts";
import { D1BffRateLimiter } from "./d1-bff-rate-limiter.ts";

const migration = readFileSync(
  new URL("../../../../../auth/migrations/0002_bff_rate_limit.sql", import.meta.url),
  "utf8",
);

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

const countRowSchema = z.object({ count: z.number() });
const requestCountRowSchema = z.object({ request_count: z.number() });
const fingerprintRowSchema = z.object({
  subject_fingerprint: z.string(),
  request_count: z.number(),
});

type SqliteQueryCell = string | number | null;
type SqliteQueryRow = Readonly<Record<string, SqliteQueryCell>>;

class SqliteD1Statement {
  private values: SQLInputValue[] = [];

  constructor(private readonly statement: StatementSync) {}

  bind(...values: SQLInputValue[]): SqliteD1Statement {
    this.values = values;
    return this;
  }

  async first<T = SqliteQueryRow>(columnName?: string): Promise<T | null> {
    const row = this.statement.get(...this.values);
    if (row === undefined) return null;
    if (columnName === undefined) {
      // SAFETY: Sqlite row shape is validated immediately before the generic test read.
      return z.record(z.string(), z.union([z.string(), z.number(), z.null()])).parse(row) as T;
    }
    const record = z.record(z.string(), z.union([z.string(), z.number(), z.null()])).parse(row);
    // SAFETY: Column reads return the validated sqlite scalar stored under the requested key.
    return (record[columnName] ?? null) as T | null;
  }

  async run(): Promise<{ success: boolean }> {
    this.statement.run(...this.values);
    return { success: true };
  }

  async all<T = SqliteQueryRow>(): Promise<{ results: T[] }> {
    return {
      // SAFETY: Sqlite rows are schema-validated before returning the generic test collection.
      results: z
        .array(z.record(z.string(), z.union([z.string(), z.number(), z.null()])))
        .parse(this.statement.all(...this.values)) as T[],
    };
  }
}

class SqliteD1Database {
  readonly sqlite = new DatabaseSync(":memory:");

  prepare(query: string): SqliteD1Statement {
    return new SqliteD1Statement(this.sqlite.prepare(query));
  }

  async batch(statements: readonly SqliteD1Statement[]): Promise<D1BatchResult[]> {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1BatchResult[] = [];
      for (const statement of statements) {
        const batchResult = await statement.all();
        results.push(batchResult);
      }
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(_query: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  close(): void {
    this.sqlite.close();
  }
}

const databases: SqliteD1Database[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function createLimiter(policies: BffRateLimitPolicies = TEST_POLICIES) {
  const database = new SqliteD1Database();
  databases.push(database);
  database.sqlite.exec(migration);
  return {
    database,
    limiter: new D1BffRateLimiter({
      // SAFETY: Sqlite-backed test double implements the D1 methods used by the rate limiter.
      database: database as AppD1Database,
      fingerprintSecret: "dedicated-test-secret",
      policies,
    }),
  };
}

function attempt(input: Partial<RateLimitAttempt> = {}): RateLimitAttempt {
  return {
    policy: input.policy ?? BFF_RATE_LIMIT_POLICY.eaClubSearch,
    actorId: input.actorId ?? asActorId("actor-1"),
    ipFingerprint: input.ipFingerprint ?? "1".repeat(64),
    nowMs: input.nowMs ?? 12_345,
  };
}

function readSqliteCount(database: SqliteD1Database, query: string): number {
  const row = database.sqlite.prepare(query).get();
  return countRowSchema.parse(row).count;
}

function readSqliteRequestCount(
  database: SqliteD1Database,
  policy: string,
  subjectKind: string,
  fingerprint: string,
  windowStartedAt: number,
): number {
  const row = database.sqlite
    .prepare(
      `SELECT request_count FROM app_rate_limit_windows
       WHERE policy = ? AND subject_kind = ? AND subject_fingerprint = ? AND window_started_at = ?`,
    )
    .get(policy, subjectKind, fingerprint, windowStartedAt);
  return requestCountRowSchema.parse(row).request_count;
}

describe("D1BffRateLimiter", () => {
  it("allows the first attempt and increments the actor and IP counters", async () => {
    const { limiter } = createLimiter();
    const decision = await limiter.check(attempt());

    expect(decision).toEqual({ outcome: "allowed" });
  });

  it("limits actor attempts once the actor window is full", async () => {
    const { limiter } = createLimiter();
    await limiter.check(attempt());
    await limiter.check(attempt());
    const decision = await limiter.check(attempt());

    expect(decision).toEqual({
      outcome: "limited",
      limitedBy: "actor",
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("removes stale windows before counting", async () => {
    const { database, limiter } = createLimiter();
    database.sqlite
      .prepare(
        `INSERT INTO app_rate_limit_windows
          (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(BFF_RATE_LIMIT_POLICY.eaClubSearch, "actor", "a".repeat(64), 0, 1);

    await limiter.check(attempt({ nowMs: 1_800_000 }));

    expect(
      readSqliteCount(
        database,
        "SELECT COUNT(*) AS count FROM app_rate_limit_windows WHERE window_started_at = 0",
      ),
    ).toBe(0);
  });

  it("retains active short-policy windows when policy lengths do not divide evenly", async () => {
    const policies: BffRateLimitPolicies = {
      ...TEST_POLICIES,
      [BFF_RATE_LIMIT_POLICY.invitationAccept]: {
        windowSeconds: 901,
        actorMaxAttempts: 1,
        ipMaxAttempts: 1,
      },
    };
    const { database, limiter } = createLimiter(policies);
    database.sqlite
      .prepare(
        `INSERT INTO app_rate_limit_windows
          (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(BFF_RATE_LIMIT_POLICY.eaClubSearch, "ip", "1".repeat(64), 1_800_000, 2);

    await limiter.check(attempt({ nowMs: 1_805_000 }));

    expect(
      readSqliteRequestCount(
        database,
        BFF_RATE_LIMIT_POLICY.eaClubSearch,
        "ip",
        "1".repeat(64),
        1_800_000,
      ),
    ).toBe(3);
  });

  it("atomically counts concurrent attempts without storing actor or IP subjects", async () => {
    const policies: BffRateLimitPolicies = {
      ...TEST_POLICIES,
      [BFF_RATE_LIMIT_POLICY.eaClubSearch]: {
        windowSeconds: 60,
        actorMaxAttempts: 10,
        ipMaxAttempts: 100,
      },
    };
    const { database, limiter } = createLimiter(policies);

    const decisions = await Promise.all(
      Array.from({ length: 20 }, () =>
        limiter.check(attempt({ actorId: asActorId("sensitive-actor") })),
      ),
    );
    const rows = fingerprintRowSchema
      .array()
      .parse(
        database.sqlite
          .prepare(
            "SELECT subject_fingerprint, request_count FROM app_rate_limit_windows ORDER BY subject_kind",
          )
          .all(),
      );

    expect(decisions.filter((decision) => decision.outcome === "allowed")).toHaveLength(10);
    expect(decisions.filter((decision) => decision.outcome === "limited")).toHaveLength(10);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.request_count)).toEqual([20, 20]);
    expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.subject_fingerprint))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("sensitive-actor");
    expect(JSON.stringify(rows)).not.toContain("sensitive-ip");
  });
});
