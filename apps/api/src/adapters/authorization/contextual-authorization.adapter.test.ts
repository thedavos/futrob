import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { TEAM_PERMISSION } from "@futrob/teams";
import { createRbacMatrixFixture, RBAC_MATRIX_NOW } from "./rbac-matrix.fixture.ts";

describe("ContextualAuthorizationAdapter", () => {
  it("allows any authenticated actor to read only their own statistics at platform scope", async () => {
    const fixture = await createRbacMatrixFixture();

    const decision = await fixture.authorization.decide({
      actorId: fixture.actors.outsider,
      permission: STATISTICS_PERMISSION.readOwn,
      scope: fixture.scope("platform"),
    });
    await fixture.grants.upsert({
      id: "deny-own-statistics",
      organizationId: null,
      actorId: fixture.actors.outsider,
      permission: STATISTICS_PERMISSION.readOwn,
      effect: "deny",
      scopeType: "platform",
      scopeId: "platform",
      grantedByActorId: fixture.actors.superuser,
      reason: null,
      createdAt: RBAC_MATRIX_NOW,
      updatedAt: RBAC_MATRIX_NOW,
    });
    const denied = await fixture.authorization.decide({
      actorId: fixture.actors.outsider,
      permission: STATISTICS_PERMISSION.readOwn,
      scope: fixture.scope("platform"),
    });

    expect(decision.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
  });

  it("isolates organization authority from another tenant", async () => {
    const fixture = await createRbacMatrixFixture();
    const own = await fixture.authorization.decide({
      actorId: fixture.actors.organizer,
      permission: COMPETITION_PERMISSION.update,
      scope: fixture.scope("orgA.compA"),
    });
    const otherTenant = await fixture.authorization.decide({
      actorId: fixture.actors.organizer,
      permission: COMPETITION_PERMISSION.update,
      scope: fixture.scope("orgB.compB"),
    });
    expect(own.allowed).toBe(true);
    expect(otherTenant.allowed).toBe(false);
  });

  it("resolves every organization and platform role bundle", async () => {
    const fixture = await createRbacMatrixFixture();
    const scope = fixture.scope("orgA.compA");
    const [organizer, staff, member, superuser] = await Promise.all([
      fixture.authorization.decide({
        actorId: fixture.actors.organizer,
        permission: COMPETITION_PERMISSION.update,
        scope,
      }),
      fixture.authorization.decide({
        actorId: fixture.actors.organizationStaff,
        permission: COMPETITION_PERMISSION.update,
        scope,
      }),
      fixture.authorization.decide({
        actorId: fixture.actors.organizationMember,
        permission: COMPETITION_PERMISSION.update,
        scope,
      }),
      fixture.authorization.decide({
        actorId: fixture.actors.superuser,
        permission: COMPETITION_PERMISSION.update,
        scope: fixture.scope("orgB.compB"),
      }),
    ]);
    expect([organizer.allowed, staff.allowed, member.allowed, superuser.allowed]).toEqual([
      true,
      true,
      false,
      true,
    ]);
  });

  it("resolves staff, captain and player competition bundles", async () => {
    const fixture = await createRbacMatrixFixture();
    const scope = fixture.scope("orgA.compA");
    for (const actorId of [
      fixture.actors.competitionStaff,
      fixture.actors.competitionCaptain,
      fixture.actors.competitionPlayer,
    ]) {
      const read = await fixture.authorization.decide({
        actorId,
        permission: COMPETITION_PERMISSION.read,
        scope,
      });
      expect(read.allowed).toBe(true);
    }
    for (const actorId of [fixture.actors.competitionCaptain, fixture.actors.competitionPlayer]) {
      const update = await fixture.authorization.decide({
        actorId,
        permission: COMPETITION_PERMISSION.update,
        scope,
      });
      expect(update.allowed).toBe(false);
    }
  });

  it("resolves captain, vice captain and player roster bundles", async () => {
    const fixture = await createRbacMatrixFixture();
    const scope = fixture.scope("orgA.compA.teamA");
    const captain = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: TEAM_PERMISSION.rosterRolesManage,
      scope,
    });
    const vice = await fixture.authorization.decide({
      actorId: fixture.actors.viceCaptain,
      permission: TEAM_PERMISSION.rosterManage,
      scope,
    });
    const viceRoles = await fixture.authorization.decide({
      actorId: fixture.actors.viceCaptain,
      permission: TEAM_PERMISSION.rosterRolesManage,
      scope,
    });
    const playerRead = await fixture.authorization.decide({
      actorId: fixture.actors.rosterPlayer,
      permission: TEAM_PERMISSION.rosterRead,
      scope,
    });
    const playerManage = await fixture.authorization.decide({
      actorId: fixture.actors.rosterPlayer,
      permission: TEAM_PERMISSION.rosterManage,
      scope,
    });
    expect([
      captain.allowed,
      vice.allowed,
      viceRoles.allowed,
      playerRead.allowed,
      playerManage.allowed,
    ]).toEqual([true, true, false, true, false]);
  });

  it("lets a roster-only player rediscover its competition but not a sibling", async () => {
    const fixture = await createRbacMatrixFixture();
    const own = await fixture.authorization.decide({
      actorId: fixture.actors.rosterPlayer,
      permission: COMPETITION_PERMISSION.read,
      scope: fixture.scope("orgA.compA"),
    });
    const sibling = await fixture.authorization.decide({
      actorId: fixture.actors.rosterPlayer,
      permission: COMPETITION_PERMISSION.read,
      scope: fixture.scope("orgA.compSibling"),
    });
    expect(own.allowed).toBe(true);
    expect(sibling.allowed).toBe(false);
  });

  it("keeps competition staff inside its competition", async () => {
    const fixture = await createRbacMatrixFixture();
    const own = await fixture.authorization.decide({
      actorId: fixture.actors.competitionStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: fixture.scope("orgA.compA"),
    });
    const sibling = await fixture.authorization.decide({
      actorId: fixture.actors.competitionStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: fixture.scope("orgA.compSibling"),
    });
    expect(own.allowed).toBe(true);
    expect(sibling.allowed).toBe(false);
  });

  it("allows a captain to manage only its roster Team", async () => {
    const fixture = await createRbacMatrixFixture();
    const ownTeam = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: TEAM_PERMISSION.rosterManage,
      scope: fixture.scope("orgA.compA.teamA"),
    });
    const rival = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: TEAM_PERMISSION.rosterManage,
      scope: fixture.scope("orgA.compA.teamRival"),
    });
    expect(ownTeam.allowed).toBe(true);
    expect(rival.allowed).toBe(false);
  });

  it("allows Team operations before entry approval without granting encounter authority", async () => {
    const fixture = await createRbacMatrixFixture();
    const entry = await fixture.entries.findByCompetitionAndTeam(
      fixture.ids.orgA,
      fixture.ids.compA,
      fixture.ids.teamA,
    );
    expect(entry).not.toBeNull();
    await fixture.entries.save({ ...entry!, status: "pending" });

    const competitionRead = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: COMPETITION_PERMISSION.participantsRead,
      scope: fixture.scope("orgA.compA"),
    });
    const rosterRead = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: TEAM_PERMISSION.rosterRead,
      scope: fixture.scope("orgA.compA.teamA"),
    });
    const officialSelection = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: "encounters.official-selection.propose",
      scope: fixture.scope("orgA.compA.teamA.encounter"),
    });

    expect(competitionRead.allowed).toBe(true);
    expect(rosterRead.allowed).toBe(true);
    expect(officialSelection.allowed).toBe(false);
  });

  it("keeps rejected-entry roster reads without write or encounter authority", async () => {
    const fixture = await createRbacMatrixFixture();
    const entry = await fixture.entries.findByCompetitionAndTeam(
      fixture.ids.orgA,
      fixture.ids.compA,
      fixture.ids.teamA,
    );
    expect(entry).not.toBeNull();
    await fixture.entries.save({ ...entry!, status: "rejected" });

    const rosterRead = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: TEAM_PERMISSION.rosterRead,
      scope: fixture.scope("orgA.compA.teamA"),
    });
    const rosterManage = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: TEAM_PERMISSION.rosterManage,
      scope: fixture.scope("orgA.compA.teamA"),
    });
    const officialSelection = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: "encounters.official-selection.propose",
      scope: fixture.scope("orgA.compA.teamA.encounter"),
    });

    expect(rosterRead.allowed).toBe(true);
    expect(rosterManage.allowed).toBe(false);
    expect(officialSelection.allowed).toBe(false);
  });

  it("applies deny in the same scope and lets a more-specific allow override it", async () => {
    const fixture = await createRbacMatrixFixture();
    await fixture.grants.upsert({
      id: "deny-org",
      organizationId: fixture.ids.orgA,
      actorId: fixture.actors.organizationStaff,
      permission: COMPETITION_PERMISSION.update,
      effect: "deny",
      scopeType: "organization",
      scopeId: fixture.ids.orgA,
      grantedByActorId: fixture.actors.organizer,
      reason: null,
      createdAt: RBAC_MATRIX_NOW,
      updatedAt: RBAC_MATRIX_NOW,
    });
    const denied = await fixture.authorization.decide({
      actorId: fixture.actors.organizationStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: fixture.scope("orgA.compA"),
    });
    await fixture.grants.upsert({
      id: "allow-comp",
      organizationId: fixture.ids.orgA,
      actorId: fixture.actors.organizationStaff,
      permission: COMPETITION_PERMISSION.update,
      effect: "allow",
      scopeType: "competition",
      scopeId: fixture.ids.compA,
      grantedByActorId: fixture.actors.organizer,
      reason: null,
      createdAt: RBAC_MATRIX_NOW,
      updatedAt: RBAC_MATRIX_NOW,
    });
    const allowed = await fixture.authorization.decide({
      actorId: fixture.actors.organizationStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: fixture.scope("orgA.compA"),
    });
    expect(denied.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it("derives encounter authority only from a participating Team", async () => {
    const fixture = await createRbacMatrixFixture();
    const participant = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: "encounters.official-selection.propose",
      scope: fixture.scope("orgA.compA.encounter"),
    });
    const wrongTeam = await fixture.authorization.decide({
      actorId: fixture.actors.rosterCaptain,
      permission: "encounters.official-selection.propose",
      scope: fixture.scope("orgA.compA.teamB.encounter"),
    });
    expect(participant.allowed).toBe(true);
    expect(wrongTeam.allowed).toBe(false);
    expect(wrongTeam.reason).toBe("scope-mismatch");
  });
});
