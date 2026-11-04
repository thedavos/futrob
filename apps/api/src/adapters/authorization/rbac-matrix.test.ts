import { describe, expect, it } from "vite-plus/test";
import type { Permission } from "@futrob/shared-kernel";
import {
  createRbacMatrixFixture,
  RBAC_MATRIX_NOW,
  type RbacMatrixFixture,
  type RbacScopeKey,
} from "./rbac-matrix.fixture.ts";
import { type RbacGrantSeed, type RbacMatrixCase } from "./rbac-matrix.oracle.ts";
import { RBAC_MATRIX_CASES } from "./rbac-matrix.cases.ts";
import { InMemoryAccessGrantRepository } from "./in-memory.repository.ts";

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
});
