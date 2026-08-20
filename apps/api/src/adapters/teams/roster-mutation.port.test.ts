import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  asPgPool,
  createFakePgClient,
  createFakePgPool,
  type FakePgClient,
} from "@/adapters/persistence/pg-test-double.ts";
import { InMemoryRosterMutationPort, PostgresRosterMutationPort } from "./roster-mutation.port.ts";
import {
  InMemoryCompetitionRosterMembershipRepository,
  PostgresCompetitionRosterMembershipRepository,
} from "./team-roster.repositories.ts";

const scope = {
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  teamId: asTeamId("team-1"),
};

describe("roster mutation ports", () => {
  it("serializes concurrent in-memory mutations for one roster", async () => {
    const mutations = new InMemoryRosterMutationPort();
    let active = 0;
    let maximumActive = 0;
    const operation = () =>
      mutations.runExclusive(scope, async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        active -= 1;
      });

    await Promise.all([operation(), operation(), operation()]);

    expect(maximumActive).toBe(1);
  });

  it("acquires the roster advisory lock inside the transaction", async () => {
    const calls: string[] = [];
    const queryImpl = vi.fn(async (sql: string) => {
      calls.push(sql);
      return { rows: [] };
    }) satisfies FakePgClient["query"];
    const client = createFakePgClient(queryImpl);
    const pool = asPgPool(createFakePgPool(client));
    const transaction = {
      runInTransaction: async <T>(operation: () => Promise<T>) => {
        calls.push("transaction:start");
        const result = await operation();
        calls.push("transaction:end");
        return result;
      },
    };
    const mutations = new PostgresRosterMutationPort(pool, transaction);

    await mutations.runExclusive(scope, async () => {
      calls.push("operation");
    });

    expect(calls).toEqual([
      "transaction:start",
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      "operation",
      "transaction:end",
    ]);
    expect(client.queries).toContain("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))");
  });
});

describe("roster membership conflict writes", () => {
  const membership = {
    id: "membership-1",
    ...scope,
    playerProfileId: "player-1",
    gameAccountId: null,
    role: "player" as const,
    createdAt: new Date("2026-08-11T00:00:00.000Z"),
  };

  it("returns null for an in-memory cross-Team competition conflict", async () => {
    const rosters = new InMemoryCompetitionRosterMembershipRepository();
    await rosters.add(membership);

    const conflicting = await rosters.add({
      ...membership,
      id: "membership-2",
      teamId: asTeamId("team-2"),
    });

    expect(conflicting).toBeNull();
  });

  it("returns null when Postgres rejects the unique membership insert", async () => {
    const client = createFakePgClient(
      vi.fn(async () => ({ rows: [] })) satisfies FakePgClient["query"],
    );
    const pool = asPgPool(createFakePgPool(client));
    const rosters = new PostgresCompetitionRosterMembershipRepository(pool);

    const conflicting = await rosters.add(membership);

    expect(conflicting).toBeNull();
    expect(client.queries[0]).toContain("DO NOTHING");
  });
});
