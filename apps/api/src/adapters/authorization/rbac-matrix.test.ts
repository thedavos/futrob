import { authorizationScopeTypeSchema } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId, type Permission } from "@futrob/shared-kernel";
import type { PoolClient } from "pg";
import { asPgPool } from "@/adapters/persistence/pg-test-double.ts";
import {
  createRbacMatrixFixture,
  RBAC_MATRIX_NOW,
  type RbacMatrixFixture,
  type RbacScopeKey,
} from "./rbac-matrix.fixture.ts";
import { type RbacGrantSeed, type RbacMatrixCase } from "./rbac-matrix.oracle.ts";
import { RBAC_MATRIX_CASES, rbacMatrixCoverageSummary } from "./rbac-matrix.cases.ts";
import { InMemoryAccessGrantRepository } from "./in-memory.repository.ts";
import { PostgresAccessGrantRepository, type AccessGrantRow } from "./postgres.repository.ts";

function scopeIdFor(fixture: RbacMatrixFixture, seed: RbacGrantSeed): string {
  if (seed.scopeIdFrom === "platform") return "platform";
  if (seed.scopeIdFrom === "actor-org") return fixture.ids.orgA;
  const scope = fixture.scope(seed.scopeIdFrom);
  switch (seed.scopeType) {
    case "platform":
      return "platform";
    case "organization":
      return scope.organizationId ?? fixture.ids.orgA;
    case "competition":
      return scope.competitionId ?? fixture.ids.compA;
    case "team":
      return scope.teamId ?? fixture.ids.teamA;
    case "encounter":
      return scope.encounterId ?? fixture.ids.encounterId;
  }
}

async function seedGrants(fixture: RbacMatrixFixture, grants: readonly RbacGrantSeed[]) {
  for (const grant of grants) {
    await fixture.grants.upsert({
      id: grant.id,
      organizationId: grant.scopeType === "platform" ? null : fixture.ids.orgA,
      actorId: fixture.actors[grant.actor],
      permission: grant.permission,
      effect: grant.effect,
      scopeType: grant.scopeType,
      scopeId: scopeIdFor(fixture, grant),
      grantedByActorId: fixture.actors.organizer,
      reason: null,
      createdAt: RBAC_MATRIX_NOW,
      updatedAt: RBAC_MATRIX_NOW,
    });
  }
}

async function runCase(fixture: RbacMatrixFixture, matrixCase: RbacMatrixCase) {
  if (matrixCase.grants?.length) {
    await seedGrants(fixture, matrixCase.grants);
  }
  const decision = await fixture.authorization.decide({
    actorId: fixture.actors[matrixCase.actor],
    permission: matrixCase.permission,
    scope: fixture.scope(matrixCase.scope),
  });
  expect(decision.allowed, matrixCase.id).toBe(matrixCase.expected.allowed);
  if (matrixCase.expected.reason) {
    expect(decision.reason, matrixCase.id).toBe(matrixCase.expected.reason);
  }
}

describe("RBAC matrix", () => {
  it("publishes a non-empty coverage map", () => {
    const summary = rbacMatrixCoverageSummary();
    expect(summary.total).toBeGreaterThan(100);
    expect(summary.byFamily.bundle).toBeGreaterThan(50);
    expect(summary.byFamily.isolation).toBeGreaterThan(5);
    expect(summary.byFamily.encounter).toBeGreaterThan(5);
    expect(summary.byFamily.grants).toBeGreaterThan(3);
    expect(summary.actors).toContain("superuser");
    expect(summary.actors).toContain("rivalCaptain");
    expect(summary.permissions).toContain("encounters.results.approve");
  });

  it.each(RBAC_MATRIX_CASES.map((matrixCase) => [matrixCase.id, matrixCase] as const))(
    "%s",
    async (_id, matrixCase) => {
      const fixture = await createRbacMatrixFixture();
      await runCase(fixture, matrixCase);
    },
  );

  it("getEffectiveAccess mirrors decide for probe permissions", async () => {
    const fixture = await createRbacMatrixFixture();
    const probes: Array<{
      actor: RbacMatrixCase["actor"];
      scope: RbacScopeKey;
      permission: Permission;
    }> = [
      {
        actor: "organizationMember",
        scope: "orgA",
        permission: "organizations.update",
      },
      {
        actor: "rosterCaptain",
        scope: "orgA.compA.teamA",
        permission: "teams.roster.roles.manage",
      },
      {
        actor: "rosterPlayer",
        scope: "orgA.compA.encounter",
        permission: "encounters.official-selection.propose",
      },
    ];
    for (const probe of probes) {
      const decided = await fixture.authorization.decide({
        actorId: fixture.actors[probe.actor],
        permission: probe.permission,
        scope: fixture.scope(probe.scope),
      });
      const access = await fixture.authorization.getEffectiveAccess({
        actorId: fixture.actors[probe.actor],
        scope: fixture.scope(probe.scope),
        permissions: [probe.permission],
      });
      expect(access.permissions[0]?.allowed).toBe(decided.allowed);
    }
  });
});

describe("RBAC grant store parity", () => {
  it("in-memory lists only the requested tenant scopes", async () => {
    const repository = new InMemoryAccessGrantRepository();
    const fixture = await createRbacMatrixFixture();
    const now = RBAC_MATRIX_NOW;
    await repository.upsert({
      id: "g-own",
      organizationId: fixture.ids.orgA,
      actorId: fixture.actors.organizationMember,
      permission: "organizations.update",
      effect: "allow",
      scopeType: "organization",
      scopeId: fixture.ids.orgA,
      grantedByActorId: fixture.actors.organizer,
      reason: null,
      createdAt: now,
      updatedAt: now,
    });
    await repository.upsert({
      id: "g-other",
      organizationId: fixture.ids.orgB,
      actorId: fixture.actors.organizationMember,
      permission: "organizations.update",
      effect: "allow",
      scopeType: "organization",
      scopeId: fixture.ids.orgB,
      grantedByActorId: fixture.actors.organizerB,
      reason: null,
      createdAt: now,
      updatedAt: now,
    });

    const listed = await repository.listForActorAndScopes(
      fixture.actors.organizationMember,
      fixture.ids.orgA,
      [{ scopeType: "organization", scopeId: fixture.ids.orgA }],
    );
    expect(listed.map((row) => row.id)).toEqual(["g-own"]);
  });

  it("Postgres list query binds tenant + scope arrays the same way", async () => {
    const own: AccessGrantRow = {
      id: "g-own",
      organization_id: "org-a",
      actor_id: "organization-member",
      permission: "organizations.update",
      effect: "allow",
      scope_type: "organization",
      scope_id: "org-a",
      granted_by_actor_id: "organizer-a",
      reason: null,
      created_at: RBAC_MATRIX_NOW,
      updated_at: RBAC_MATRIX_NOW,
    };
    const pool = new StubPool([{ rows: [own], rowCount: 1 }]);
    const repository = new PostgresAccessGrantRepository(asPgPool(pool));
    const listed = await repository.listForActorAndScopes(
      asActorId("organization-member"),
      asOrganizationId("org-a"),
      [{ scopeType: authorizationScopeTypeSchema.parse("organization"), scopeId: "org-a" }],
    );
    expect(listed.map((row) => row.id)).toEqual(["g-own"]);
    expect(pool.calls[0]?.values).toEqual([
      "organization-member",
      "org-a",
      ["organization"],
      ["org-a"],
    ]);
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
    return this.results.shift() ?? { rows: [], rowCount: 0 };
  }
}
