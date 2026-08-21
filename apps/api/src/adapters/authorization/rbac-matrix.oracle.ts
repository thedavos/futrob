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
