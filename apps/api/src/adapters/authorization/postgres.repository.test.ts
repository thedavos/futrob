import type { PoolClient } from "pg";
import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { asPgPool } from "@/adapters/persistence/pg-test-double.ts";
import {
  PostgresAccessGrantRepository,
  PostgresAuthorizationAuditRepository,
  PostgresPlatformRoleRepository,
  type AccessGrantRow,
} from "./postgres.repository.ts";

const now = new Date("2026-08-07T12:00:00.000Z");

describe("Postgres contextual authorization repositories", () => {
  it("round-trips grants with the same shape as the in-memory adapter", async () => {
    const row = grantRow();
    const pool = new StubPool([
      { rows: [row], rowCount: 1 },
      { rows: [row], rowCount: 1 },
    ]);
    const repository = new PostgresAccessGrantRepository(asPgPool(pool));

    const saved = await repository.upsert({
      id: "grant-1",
      organizationId: asOrganizationId("org-1"),
      actorId: asActorId("member-1"),
      permission: "teams.update",
      effect: "deny",
      scopeType: "team",
      scopeId: "team-1",
      grantedByActorId: asActorId("organizer-1"),
      reason: "temporary",
      createdAt: now,
      updatedAt: now,
    });
    const listed = await repository.listForActorAndScopes(
      asActorId("member-1"),
      asOrganizationId("org-1"),
      [{ scopeType: "team", scopeId: "team-1" }],
    );

    expect(saved).toMatchObject({ id: "grant-1", effect: "deny", scopeType: "team" });
    expect(listed).toEqual([saved]);
    expect(pool.calls[0]?.sql).toContain("ON CONFLICT");
    expect(pool.calls[1]?.values).toEqual(["member-1", "org-1", ["team"], ["team-1"]]);
  });

  it("persists platform assignments", async () => {
    const row = {
      actor_id: "super-1",
      role: "superuser",
      assigned_by_actor_id: "super-1",
      created_at: now,
    };
    const pool = new StubPool([
      { rows: [row], rowCount: 1 },
      { rows: [{ count: 1 }], rowCount: 1 },
    ]);
    const repository = new PostgresPlatformRoleRepository(asPgPool(pool));

    const assignment = await repository.assignSuperuser({
      actorId: asActorId("super-1"),
      role: "superuser",
      assignedByActorId: asActorId("super-1"),
      createdAt: now,
    });

    expect(assignment.role).toBe("superuser");
    await expect(repository.countSuperusers()).resolves.toBe(1);
  });

  it("writes and reads audit entries", async () => {
    const auditRow = {
      id: "audit-1",
      actor_id: "organizer-1",
      action: "authorization.grant.created",
      target_actor_id: "member-1",
      organization_id: "org-1",
      scope_type: "organization",
      scope_id: "org-1",
      permission: "teams.update",
      before_value: null,
      after_value: { effect: "allow" },
      reason: "operational",
      created_at: now,
    };
    const pool = new StubPool([
      { rows: [], rowCount: 1 },
      { rows: [auditRow], rowCount: 1 },
    ]);
    const repository = new PostgresAuthorizationAuditRepository(asPgPool(pool));

    await repository.append({
      id: "audit-1",
      actorId: asActorId("organizer-1"),
      action: "authorization.grant.created",
      targetActorId: asActorId("member-1"),
      organizationId: asOrganizationId("org-1"),
      scopeType: "organization",
      scopeId: "org-1",
      permission: "teams.update",
      before: null,
      after: { effect: "allow" },
      reason: "operational",
      createdAt: now,
    });
    const entries = await repository.listByOrganization(asOrganizationId("org-1"), 20);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: "audit-1", permission: "teams.update" });
    expect(pool.calls[0]?.values?.[9]).toBe(JSON.stringify({ effect: "allow" }));
  });
});

class StubPool {
  readonly calls: { readonly sql: string; readonly values?: readonly unknown[] }[] = [];

  constructor(
    private readonly results: {
      readonly rows: readonly object[];
      readonly rowCount: number;
    }[],
  ) {}

  async connect(): Promise<PoolClient> {
    throw new Error("StubPool.connect is not used in these tests");
  }

  async query(sql: string, values?: readonly unknown[]) {
    this.calls.push({ sql, values });
    const result = this.results.shift();
    if (!result) throw new Error("Unexpected query");
    return result;
  }
}

function grantRow(): AccessGrantRow {
  return {
    id: "grant-1",
    organization_id: "org-1",
    actor_id: "member-1",
    permission: "teams.update",
    effect: "deny",
    scope_type: "team",
    scope_id: "team-1",
    granted_by_actor_id: "organizer-1",
    reason: "temporary",
    created_at: now,
    updated_at: now,
  };
}
