import type { Permission } from "@futrob/shared-kernel";
import type { RosterMembershipRole } from "../entities/competition-roster-membership.ts";

export const TEAM_PERMISSION = {
  read: "teams.read",
  create: "teams.create",
  update: "teams.update",
  rosterRead: "teams.roster.read",
  rosterManage: "teams.roster.manage",
  rosterRolesManage: "teams.roster.roles.manage",
  invitationsManage: "teams.roster.invitations.manage",
  externalClubRead: "teams.external-club.read",
  externalClubManage: "teams.external-club.manage",
} as const satisfies Record<string, Permission>;

export const TEAM_PERMISSIONS = Object.values(TEAM_PERMISSION);

export const ROSTER_ROLE_PERMISSIONS = {
  captain: TEAM_PERMISSIONS.filter((permission) => permission !== TEAM_PERMISSION.create),
  vice_captain: [
    TEAM_PERMISSION.read,
    TEAM_PERMISSION.update,
    TEAM_PERMISSION.rosterRead,
    TEAM_PERMISSION.rosterManage,
    TEAM_PERMISSION.invitationsManage,
    TEAM_PERMISSION.externalClubRead,
    TEAM_PERMISSION.externalClubManage,
  ],
  player: [TEAM_PERMISSION.read, TEAM_PERMISSION.rosterRead, TEAM_PERMISSION.externalClubRead],
} as const satisfies Record<RosterMembershipRole, readonly Permission[]>;

/**
 * Permission needed to hand a roster role to someone else (invitation or role change).
 * Making a captain or vice-captain is a role change, so it needs the same permission as
 * changing roles; only plain players can be invited with invitation rights alone.
 */
export function permissionToGrantRosterRole(role: RosterMembershipRole): Permission {
  return role === "player" ? TEAM_PERMISSION.invitationsManage : TEAM_PERMISSION.rosterRolesManage;
}
