import { COMPETITION_PERMISSION, COMPETITION_PERMISSIONS } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION, ORGANIZATION_PERMISSIONS } from "@futrob/organizations";
import { RESULT_PERMISSION, RESULT_PERMISSIONS } from "@futrob/results";
import { ENCOUNTER_PERMISSION, ENCOUNTER_PERMISSIONS } from "@futrob/scheduling";
import { STATISTICS_PERMISSION, STATISTICS_PERMISSIONS } from "@futrob/statistics";
import type { AuthorizationScopeType, Permission } from "@futrob/shared-kernel";
import { ROSTER_ROLE_PERMISSIONS, TEAM_PERMISSION, TEAM_PERMISSIONS } from "@futrob/teams";
import {
  contextualCompetitionRolePermissions,
  contextualOrganizationRolePermissions,
} from "./contextual-authorization.adapter.ts";
import type { RbacActorKey, RbacScopeKey } from "./rbac-matrix.fixture.ts";

export const RBAC_ALL_PERMISSIONS = [
  ...ORGANIZATION_PERMISSIONS,
  ...COMPETITION_PERMISSIONS,
  ...TEAM_PERMISSIONS,
  ...ENCOUNTER_PERMISSIONS,
  ...RESULT_PERMISSIONS,
  ...STATISTICS_PERMISSIONS,
] as const satisfies readonly Permission[];

/** Representative probes: every catalog + high-risk mutate/read pairs. */
export const RBAC_PROBE_PERMISSIONS = [
  ORGANIZATION_PERMISSION.read,
  ORGANIZATION_PERMISSION.update,
  ORGANIZATION_PERMISSION.grantsManage,
  ORGANIZATION_PERMISSION.superusersManage,
  COMPETITION_PERMISSION.read,
  COMPETITION_PERMISSION.update,
  COMPETITION_PERMISSION.publish,
  TEAM_PERMISSION.read,
  TEAM_PERMISSION.rosterManage,
  TEAM_PERMISSION.rosterRolesManage,
  TEAM_PERMISSION.create,
  ENCOUNTER_PERMISSION.read,
  ENCOUNTER_PERMISSION.scheduleManage,
  ENCOUNTER_PERMISSION.rescheduleRequest,
  ENCOUNTER_PERMISSION.rescheduleResolve,
  RESULT_PERMISSION.officialSelectionPropose,
  RESULT_PERMISSION.officialSelectionResolve,
  RESULT_PERMISSION.resultApprove,
  STATISTICS_PERMISSION.readOwn,
  STATISTICS_PERMISSION.read,
] as const satisfies readonly Permission[];

const ENCOUNTER_CAPTAIN_BASELINE = new Set<Permission>([
  ENCOUNTER_PERMISSION.read,
  ENCOUNTER_PERMISSION.rescheduleRequest,
  RESULT_PERMISSION.officialSelectionPropose,
  RESULT_PERMISSION.officialSelectionResolve,
]);

const ENCOUNTER_PLAYER_BASELINE = new Set<Permission>([ENCOUNTER_PERMISSION.read]);

export type RbacDecisionExpectation = {
  readonly allowed: boolean;
  readonly reason?: "allowed" | "denied" | "no-assignment" | "scope-not-found" | "scope-mismatch";
};

export type RbacGrantSeed = {
  readonly id: string;
  readonly actor: RbacActorKey;
  readonly permission: Permission;
  readonly effect: "allow" | "deny";
  readonly scopeType: AuthorizationScopeType;
  readonly scopeIdFrom: RbacScopeKey | "platform" | "actor-org";
};

export type RbacMatrixCase = {
  readonly id: string;
  readonly actor: RbacActorKey;
  readonly permission: Permission;
  readonly scope: RbacScopeKey;
  readonly expected: RbacDecisionExpectation;
  readonly grants?: readonly RbacGrantSeed[];
};

function setHas(permissions: readonly Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}

function orgBaseline(role: "organizer" | "staff" | "member"): ReadonlySet<Permission> {
  return new Set(contextualOrganizationRolePermissions(role));
}

function competitionBaseline(role: "staff" | "captain" | "player"): ReadonlySet<Permission> {
  return new Set(contextualCompetitionRolePermissions(role));
}

function rosterBaseline(role: keyof typeof ROSTER_ROLE_PERMISSIONS): ReadonlySet<Permission> {
  return new Set(ROSTER_ROLE_PERMISSIONS[role]);
}

type TeamSide = "teamA" | "teamRival" | null;

function teamSideOf(scope: RbacScopeKey): TeamSide {
  if (scope.includes("teamRival")) return "teamRival";
  if (scope.includes("teamA")) return "teamA";
  return null;
}

function actorRosterSide(actor: RbacActorKey): TeamSide {
  if (actor === "rivalCaptain") return "teamRival";
  if (actor === "rosterCaptain" || actor === "viceCaptain" || actor === "rosterPlayer") {
    return "teamA";
  }
  return null;
}

function rosterResolves(actor: RbacActorKey, scope: RbacScopeKey): boolean {
  const side = actorRosterSide(actor);
  if (!side) return false;
  if (scope === "orgA.compSibling" || scope === "orgA.compSibling.encounter") return false;
  const scopedTeam = teamSideOf(scope);
  if (scopedTeam && scopedTeam !== side) return false;
  if (scope.includes("encounter") || scope.includes("compA")) return true;
  return false;
}

function isCompAScope(scope: RbacScopeKey): boolean {
  return scope === "orgA.compA" || scope.startsWith("orgA.compA.");
}

/**
 * Own-scope oracle for role bundles. Isolation / grant cases stay hard-coded.
 * Superuser is always true on every permission for any resolvable scope.
 */
export function expectedBundleDecision(
  actor: RbacActorKey,
  permission: Permission,
  scope: RbacScopeKey,
): RbacDecisionExpectation | null {
  if (scope === "orgA.compA.teamB" || scope === "orgA.compA.teamB.encounter") {
    return { allowed: false, reason: "scope-mismatch" };
  }

  if (permission === STATISTICS_PERMISSION.readOwn) {
    return { allowed: true, reason: "allowed" };
  }

  if (actor === "superuser") {
    return { allowed: true, reason: "allowed" };
  }

  if (actor === "outsider") {
    return { allowed: false, reason: "no-assignment" };
  }

  if (actor === "organizerB") {
    if (scope === "orgB" || scope === "orgB.compB") {
      const allowed = orgBaseline("organizer").has(permission);
      return { allowed, reason: allowed ? "allowed" : "no-assignment" };
    }
    return { allowed: false, reason: "no-assignment" };
  }

  if (scope === "orgB" || scope === "orgB.compB") {
    return { allowed: false, reason: "no-assignment" };
  }

  if (scope === "platform") {
    return { allowed: false, reason: "no-assignment" };
  }

  const orgLayer = (() => {
    switch (actor) {
      case "organizer":
        return orgBaseline("organizer");
      case "organizationStaff":
        return orgBaseline("staff");
      case "organizationMember":
      case "competitionStaff":
      case "competitionCaptain":
      case "competitionPlayer":
      case "rosterCaptain":
      case "viceCaptain":
      case "rosterPlayer":
      case "rivalCaptain":
        return orgBaseline("member");
      default:
        return new Set<Permission>();
    }
  })();

  const competitionLayer = (() => {
    if (!isCompAScope(scope)) return new Set<Permission>();
    switch (actor) {
      case "competitionStaff":
        return competitionBaseline("staff");
      case "competitionCaptain":
        return competitionBaseline("captain");
      case "competitionPlayer":
        return competitionBaseline("player");
      case "rosterCaptain":
      case "viceCaptain":
        return rosterResolves(actor, scope)
          ? new Set(COMPETITION_ROLE_CAPTAIN)
          : new Set<Permission>();
      case "rosterPlayer":
        return rosterResolves(actor, scope)
          ? new Set(COMPETITION_ROLE_PLAYER)
          : new Set<Permission>();
      case "rivalCaptain":
        return rosterResolves(actor, scope)
          ? new Set(COMPETITION_ROLE_CAPTAIN)
          : new Set<Permission>();
      case "organizationMember":
      case "organizationStaff":
      case "organizer":
        return new Set<Permission>();
      default:
        return new Set<Permission>();
    }
  })();

  const teamLayer = (() => {
    const scopedTeam = teamSideOf(scope);
    if (!scopedTeam) return new Set<Permission>();
    if (!rosterResolves(actor, scope)) return new Set<Permission>();
    switch (actor) {
      case "rosterCaptain":
        return rosterBaseline("captain");
      case "viceCaptain":
        return rosterBaseline("vice_captain");
      case "rosterPlayer":
        return rosterBaseline("player");
      case "rivalCaptain":
        return rosterBaseline("captain");
      case "competitionCaptain":
      case "competitionPlayer":
      case "competitionStaff":
      case "organizationMember":
      case "organizationStaff":
      case "organizer":
        return new Set<Permission>();
      default:
        return new Set<Permission>();
    }
  })();

  const encounterLayer = (() => {
    if (!scope.includes("encounter")) return new Set<Permission>();
    if (scope === "orgA.compSibling.encounter") return new Set<Permission>();
    if (!rosterResolves(actor, scope)) return new Set<Permission>();
    switch (actor) {
      case "rosterCaptain":
      case "viceCaptain":
      case "rivalCaptain":
        return ENCOUNTER_CAPTAIN_BASELINE;
      case "rosterPlayer":
        return ENCOUNTER_PLAYER_BASELINE;
      case "competitionCaptain":
      case "competitionPlayer":
      case "competitionStaff":
      case "organizationMember":
      case "organizationStaff":
      case "organizer":
        return new Set<Permission>();
      default:
        return new Set<Permission>();
    }
  })();

  const allowed =
    orgLayer.has(permission) ||
    competitionLayer.has(permission) ||
    teamLayer.has(permission) ||
    encounterLayer.has(permission);

  return {
    allowed,
    reason: allowed ? "allowed" : "no-assignment",
  };
}

const COMPETITION_ROLE_CAPTAIN = COMPETITION_PERMISSIONS.filter((permission) =>
  setHas([COMPETITION_PERMISSION.read, COMPETITION_PERMISSION.participantsRead], permission),
);

const COMPETITION_ROLE_PLAYER = COMPETITION_ROLE_CAPTAIN;

function buildRoleBundleCases(): RbacMatrixCase[] {
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

function buildIsolationCases(): RbacMatrixCase[] {
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

function buildEncounterParticipationCases(): RbacMatrixCase[] {
  return [
    {
      id: "encounter/participant-captain/propose",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/participant-vice/propose",
      actor: "viceCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/participant-player/read",
      actor: "rosterPlayer",
      permission: ENCOUNTER_PERMISSION.read,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/participant-player/no-propose",
      actor: "rosterPlayer",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/participant-captain/no-schedule-manage",
      actor: "rosterCaptain",
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: "orgA.compA.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/participant-captain/no-result-approve",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.resultApprove,
      scope: "orgA.compA.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/rival-captain/propose",
      actor: "rivalCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/wrong-team-scope",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamB.encounter",
      expected: { allowed: false, reason: "scope-mismatch" },
    },
    {
      id: "encounter/teamA-scope-ok",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/rival-on-own-team-scope",
      actor: "rivalCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamRival.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/roster-captain-on-rival-team-scope",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamRival.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/sibling-competition",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compSibling.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/org-staff/schedule-manage",
      actor: "organizationStaff",
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/org-staff/result-approve",
      actor: "organizationStaff",
      permission: RESULT_PERMISSION.resultApprove,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
  ];
}

function buildGrantPrecedenceCases(): RbacMatrixCase[] {
  return [
    {
      id: "grants/same-scope-deny-beats-bundle",
      actor: "organizationStaff",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "deny-org-update",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
      ],
      expected: { allowed: false, reason: "denied" },
    },
    {
      id: "grants/same-scope-deny-beats-allow",
      actor: "organizationStaff",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "allow-org-update",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "allow",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "deny-org-update-2",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
      ],
      expected: { allowed: false, reason: "denied" },
    },
    {
      id: "grants/specific-allow-overrides-org-deny",
      actor: "organizationStaff",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "deny-org",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "allow-comp",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "allow",
          scopeType: "competition",
          scopeIdFrom: "orgA.compA",
        },
      ],
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "grants/specific-deny-overrides-org-allow",
      actor: "organizationMember",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "allow-org-member",
          actor: "organizationMember",
          permission: COMPETITION_PERMISSION.update,
          effect: "allow",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "deny-comp-member",
          actor: "organizationMember",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "competition",
          scopeIdFrom: "orgA.compA",
        },
      ],
      expected: { allowed: false, reason: "denied" },
    },
    {
      id: "grants/team-allow-after-org-deny",
      actor: "rosterCaptain",
      permission: TEAM_PERMISSION.rosterManage,
      scope: "orgA.compA.teamA",
      grants: [
        {
          id: "deny-org-roster",
          actor: "rosterCaptain",
          permission: TEAM_PERMISSION.rosterManage,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "allow-team-roster",
          actor: "rosterCaptain",
          permission: TEAM_PERMISSION.rosterManage,
          effect: "allow",
          scopeType: "team",
          scopeIdFrom: "orgA.compA.teamA",
        },
      ],
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "grants/member-org-allow-read-mutate",
      actor: "organizationMember",
      permission: ORGANIZATION_PERMISSION.update,
      scope: "orgA",
      grants: [
        {
          id: "allow-member-update",
          actor: "organizationMember",
          permission: ORGANIZATION_PERMISSION.update,
          effect: "allow",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
      ],
      expected: { allowed: true, reason: "allowed" },
    },
  ];
}

/** Full automated matrix registry. */
export const RBAC_MATRIX_CASES: readonly RbacMatrixCase[] = [
  ...buildRoleBundleCases(),
  ...buildIsolationCases(),
  ...buildEncounterParticipationCases(),
  ...buildGrantPrecedenceCases(),
];

export function rbacMatrixCoverageSummary() {
  const byFamily: Record<string, number> = {};
  for (const matrixCase of RBAC_MATRIX_CASES) {
    const family = matrixCase.id.split("/")[0] ?? "unknown";
    byFamily[family] = (byFamily[family] ?? 0) + 1;
  }
  return {
    total: RBAC_MATRIX_CASES.length,
    byFamily,
    actors: [
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
    ],
    permissions: [...RBAC_PROBE_PERMISSIONS],
  } satisfies {
    readonly total: number;
    readonly byFamily: Record<string, number>;
    readonly actors: readonly RbacActorKey[];
    readonly permissions: readonly Permission[];
  };
}
