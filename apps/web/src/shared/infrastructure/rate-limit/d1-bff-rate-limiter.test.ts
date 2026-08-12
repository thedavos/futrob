import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import type { AppD1Database } from "../d1.ts";
import {
  BFF_RATE_LIMIT_POLICY,
  type BffRateLimitPolicies,
  type RateLimitAttempt,
} from "./bff-rate-limiter.ts";
import { D1BffRateLimiter } from "./d1-bff-rate-limiter.ts";

const migration = readFileSync(
  new URL("../../../../migrations/0002_bff_rate_limit.sql", import.meta.url),
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
};

class SqliteD1Statement {
  private values: SQLInputValue[] = [];

  constructor(private readonly statement: StatementSync) {}

  bind(...values: unknown[]): SqliteD1Statement {
    this.values = values as SQLInputValue[];
    return this;
  }

  async first<T = unknown>(columnName?: string): Promise<T | null> {
    const row = this.statement.get(...this.values) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async run(): Promise<unknown> {
    return this.statement.run(...this.values);
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    return { results: this.statement.all(...this.values) as T[] };
  }
}

class SqliteD1Database implements AppD1Database {
  readonly sqlite = new DatabaseSync(":memory:");

  prepare(query: string): SqliteD1Statement {
    return new SqliteD1Statement(this.sqlite.prepare(query));
  }

  async batch<T = unknown>(statements: unknown[]): Promise<T[]> {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: unknown[] = [];
      for (const statement of statements as SqliteD1Statement[]) {
        results.push(await statement.all());
      }
      this.sqlite.exec("COMMIT");
      return results as T[];
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(query: string): Promise<unknown> {
    return this.sqlite.exec(query);
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
      database,
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

describe("D1BffRateLimiter", () => {
  it("can apply the rate-limit migration more than once", () => {
    const database = new SqliteD1Database();
    databases.push(database);

    expect(() => {
      database.sqlite.exec(migration);
      database.sqlite.exec(migration);
    }).not.toThrow();
  });

  it("allows through the limit, rejects the next attempt and resets in a new fixed window", async () => {
    const { limiter } = createLimiter();

    await expect(limiter.check(attempt())).resolves.toEqual({ outcome: "allowed" });
    await expect(limiter.check(attempt())).resolves.toEqual({ outcome: "allowed" });
    await expect(limiter.check(attempt())).resolves.toEqual({
      outcome: "limited",
      limitedBy: "actor",
      retryAfterSeconds: 48,
    });
    await expect(limiter.check(attempt({ nowMs: 60_000 }))).resolves.toEqual({
      outcome: "allowed",
    });
  });

  it("limits actors and IPs independently", async () => {
    const { limiter } = createLimiter();

    await limiter.check(attempt({ actorId: asActorId("actor-1") }));
    await limiter.check(attempt({ actorId: asActorId("actor-2") }));
    await limiter.check(attempt({ actorId: asActorId("actor-3") }));
    const ipLimited = await limiter.check(attempt({ actorId: asActorId("actor-4") }));
    const otherIp = await limiter.check(
      attempt({ actorId: asActorId("actor-4"), ipFingerprint: "2".repeat(64) }),
    );

    expect(ipLimited).toEqual({
      outcome: "limited",
      limitedBy: "ip",
      retryAfterSeconds: 48,
    });
    expect(otherIp).toEqual({ outcome: "allowed" });
  });

  it("keeps policy windows independent for the same subjects", async () => {
    const { limiter } = createLimiter();

    await expect(limiter.check(attempt())).resolves.toEqual({ outcome: "allowed" });
    await expect(
      limiter.check(attempt({ policy: BFF_RATE_LIMIT_POLICY.invitationAccept })),
    ).resolves.toEqual({ outcome: "allowed" });
  });

  it("purges windows older than the longest active policy window", async () => {
    const { database, limiter } = createLimiter();
    database.sqlite
      .prepare(
        `INSERT INTO app_rate_limit_windows
          (policy, subject_kind, subject_fingerprint, window_started_at, request_count)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(BFF_RATE_LIMIT_POLICY.eaClubSearch, "actor", "a".repeat(64), 0, 1);

    await limiter.check(attempt({ nowMs: 1_800_000 }));

    const staleRows = database.sqlite
      .prepare("SELECT COUNT(*) AS count FROM app_rate_limit_windows WHERE window_started_at = 0")
      .get() as { count: number };
    expect(staleRows.count).toBe(0);
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

    const activeWindow = database.sqlite
      .prepare(
        `SELECT request_count FROM app_rate_limit_windows
         WHERE policy = ? AND subject_kind = ? AND subject_fingerprint = ? AND window_started_at = ?`,
      )
      .get(BFF_RATE_LIMIT_POLICY.eaClubSearch, "ip", "1".repeat(64), 1_800_000) as
      | { request_count: number }
      | undefined;
    expect(activeWindow?.request_count).toBe(3);
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
    const rows = database.sqlite
      .prepare(
        "SELECT subject_fingerprint, request_count FROM app_rate_limit_windows ORDER BY subject_kind",
      )
      .all() as { subject_fingerprint: string; request_count: number }[];

    expect(decisions.filter((decision) => decision.outcome === "allowed")).toHaveLength(10);
    expect(decisions.filter((decision) => decision.outcome === "limited")).toHaveLength(10);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.request_count)).toEqual([20, 20]);
    expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.subject_fingerprint))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("sensitive-actor");
    expect(JSON.stringify(rows)).not.toContain("sensitive-ip");
  });
});
