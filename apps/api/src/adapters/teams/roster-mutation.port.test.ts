import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it, vi } from "vite-plus/test";
import { InMemoryRosterMutationPort, PostgresRosterMutationPort } from "./roster-mutation.port.ts";

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
    const pool = {
      query: vi.fn(async (sql: string) => {
        calls.push(sql);
        return { rows: [] };
      }),
    };
    const transaction = {
      runInTransaction: async <T>(operation: () => Promise<T>) => {
        calls.push("transaction:start");
        const result = await operation();
        calls.push("transaction:end");
        return result;
      },
    };
    const mutations = new PostgresRosterMutationPort(pool as never, transaction);

    await mutations.runExclusive(scope, async () => {
      calls.push("operation");
    });

    expect(calls).toEqual([
      "transaction:start",
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      "operation",
      "transaction:end",
    ]);
    expect(pool.query).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      ["org-1:competition-1:team-1"],
    );
  });
});
