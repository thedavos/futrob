import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import type { Permission } from "@futrob/shared-kernel";
import { TEAM_PERMISSION } from "@futrob/teams";
import type { RbacActorKey, RbacScopeKey } from "./rbac-matrix.fixture.ts";
import {
  expectedBundleDecision,
  RBAC_PROBE_PERMISSIONS,
  type RbacMatrixCase,
} from "./rbac-matrix.oracle.ts";

export function buildRoleBundleCases(): RbacMatrixCase[] {
  const actors: RbacActorKey[] = [
    "superuser",
    "organizer",
    "organizationStaff",
    "organizationMember",
    "competitionStaff",
    "competitionCaptain",
    "competitionPlayer",
    "rosterCaptain",
    "viceCaptain",
    "rosterPlayer",
    "rivalCaptain",
    "outsider",
    "organizerB",
  ];

  const homeScopes: RbacScopeKey[] = [
    "orgA",
    "orgA.compA",
    "orgA.compA.teamA",
    "orgA.compA.encounter",
  ];

  const cases: RbacMatrixCase[] = [];
  for (const actor of actors) {
    for (const scope of homeScopes) {
      for (const permission of RBAC_PROBE_PERMISSIONS) {
        const expected = expectedBundleDecision(actor, permission, scope);
        if (!expected) continue;
        cases.push({
          id: `bundle/${actor}@${scope}/${permission}`,
          actor,
          permission,
          scope,
          expected,
        });
      }
    }
  }
  return cases;
}

export function buildIsolationCases(): RbacMatrixCase[] {
  const probes: Array<{
    actor: RbacActorKey;
    permission: Permission;
    own: RbacScopeKey;
    foreign: RbacScopeKey;
  }> = [
    {
      actor: "organizer",
      permission: COMPETITION_PERMISSION.update,
      own: "orgA.compA",
      foreign: "orgB.compB",
    },
    {
      actor: "organizationStaff",
      permission: COMPETITION_PERMISSION.update,
      own: "orgA.compA",
      foreign: "orgB.compB",
    },
    {
      actor: "competitionStaff",
      permission: COMPETITION_PERMISSION.update,
      own: "orgA.compA",
      foreign: "orgA.compSibling",
    },
    {
      actor: "competitionCaptain",
      permission: COMPETITION_PERMISSION.read,
      own: "orgA.compA",
      foreign: "orgA.compSibling",
    },
    {
      actor: "rosterCaptain",
      permission: TEAM_PERMISSION.rosterManage,
      own: "orgA.compA.teamA",
      foreign: "orgA.compA.teamRival",
    },
    {
      actor: "rosterPlayer",
      permission: COMPETITION_PERMISSION.read,
      own: "orgA.compA",
      foreign: "orgA.compSibling",
    },
    {
      actor: "rivalCaptain",
      permission: TEAM_PERMISSION.rosterManage,
      own: "orgA.compA.teamRival",
      foreign: "orgA.compA.teamA",
    },
  ];

  const cases: RbacMatrixCase[] = [];
  for (const probe of probes) {
    cases.push({
      id: `isolation/${probe.actor}/own/${probe.permission}`,
      actor: probe.actor,
      permission: probe.permission,
      scope: probe.own,
      expected: { allowed: true, reason: "allowed" },
    });
    cases.push({
      id: `isolation/${probe.actor}/foreign/${probe.permission}`,
      actor: probe.actor,
      permission: probe.permission,
      scope: probe.foreign,
      expected: { allowed: false },
    });
  }

  cases.push(
    {
      id: "isolation/outsider/orgA",
      actor: "outsider",
      permission: ORGANIZATION_PERMISSION.read,
      scope: "orgA",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "isolation/superuser/cross-tenant",
      actor: "superuser",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgB.compB",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "isolation/organizer/no-superuser-manage",
      actor: "organizer",
      permission: ORGANIZATION_PERMISSION.superusersManage,
      scope: "orgA",
      expected: { allowed: false, reason: "no-assignment" },
    },
  );

  return cases;
}
