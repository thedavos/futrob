import { describe, expect, it } from "vite-plus/test";
import { ROSTER_ROLE_PERMISSIONS, TEAM_PERMISSION, TEAM_PERMISSIONS } from "./team-permissions.ts";

describe("team permissions", () => {
  it("exposes unique permission strings", () => {
    expect(new Set(TEAM_PERMISSIONS).size).toBe(TEAM_PERMISSIONS.length);
  });

  it("grants captains every team permission except creating teams", () => {
    expect(ROSTER_ROLE_PERMISSIONS.captain).toEqual(
      expect.arrayContaining(
        TEAM_PERMISSIONS.filter((permission) => permission !== TEAM_PERMISSION.create),
      ),
    );
    expect(ROSTER_ROLE_PERMISSIONS.captain).not.toContain(TEAM_PERMISSION.create);
  });

  it.each(["captain", "vice_captain", "player"] as const)(
    "grants %s read access to the team and its roster",
    (role) => {
      const permissions = ROSTER_ROLE_PERMISSIONS[role];
      expect(permissions).toContain(TEAM_PERMISSION.read);
      expect(permissions).toContain(TEAM_PERMISSION.rosterRead);
    },
  );

  it("lets only captain and vice_captain manage the roster", () => {
    expect(ROSTER_ROLE_PERMISSIONS.player).not.toContain(TEAM_PERMISSION.rosterManage);
    expect(ROSTER_ROLE_PERMISSIONS.captain).toContain(TEAM_PERMISSION.rosterManage);
    expect(ROSTER_ROLE_PERMISSIONS.vice_captain).toContain(TEAM_PERMISSION.rosterManage);
  });

  it("never grants roster management permissions to players", () => {
    const playerPermissions = ROSTER_ROLE_PERMISSIONS.player;
    expect(playerPermissions).not.toContain(TEAM_PERMISSION.rosterRolesManage);
    expect(playerPermissions).not.toContain(TEAM_PERMISSION.invitationsManage);
    expect(playerPermissions).not.toContain(TEAM_PERMISSION.externalClubManage);
  });

  it("matches vice_captain to captain except for role management", () => {
    const { captain, vice_captain } = ROSTER_ROLE_PERMISSIONS;
    for (const permission of vice_captain) {
      expect(captain).toContain(permission);
    }
    expect(captain).toContain(TEAM_PERMISSION.rosterRolesManage);
    expect(vice_captain).not.toContain(TEAM_PERMISSION.rosterRolesManage);
  });
});
