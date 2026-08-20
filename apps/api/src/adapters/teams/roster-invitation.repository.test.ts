import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  asPgPool,
  createFakePgClient,
  createFakePgPool,
  type FakePgClient,
} from "@/adapters/persistence/pg-test-double.ts";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { PostgresRosterInvitationRepository } from "./roster-invitation.repository.ts";

describe("PostgresRosterInvitationRepository", () => {
  it("claims with the ambient transaction client", async () => {
    const pending = {
      id: "invitation-1",
      organization_id: "org-1",
      competition_id: "competition-1",
      team_id: "team-1",
      role: "player",
      token_hash: "token-hash",
      status: "pending",
      invited_by_actor_id: "staff-1",
      expires_at: new Date("2026-08-12T00:00:00.000Z"),
      accepted_by_actor_id: null,
      created_at: new Date("2026-08-11T00:00:00.000Z"),
      redeem_policy: "single",
    };
    const queryImpl = vi.fn(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [pending] };
      if (sql.includes("UPDATE roster_invitations")) {
        return {
          rows: [{ ...pending, status: "accepted", accepted_by_actor_id: "player-1" }],
        };
      }
      return { rows: [] };
    }) satisfies FakePgClient["query"];
    const client = {
      ...createFakePgClient(queryImpl),
      release: vi.fn(),
    };
    const fakePool = createFakePgPool(client);
    const connect = vi.fn(fakePool.connect);
    const pool = asPgPool({ ...fakePool, connect });
    const repository = new PostgresRosterInvitationRepository(pool);
    const transaction = new PostgresTransactionPort(pool);

    const claimed = await transaction.runInTransaction(() =>
      repository.claimPending(
        "token-hash",
        asActorId("player-1"),
        new Date("2026-08-11T12:00:00.000Z"),
        { hasFreeSlot: true, maxRosterSize: 11 },
      ),
    );

    expect(claimed?.status).toBe("accepted");
    expect(connect).toHaveBeenCalledTimes(1);
    expect(client.queries).toContain("BEGIN");
    expect(client.queries).toContain("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
