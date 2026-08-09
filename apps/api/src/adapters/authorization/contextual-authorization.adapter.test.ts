import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import {
  InMemoryOrganizationRepository,
  InMemoryMembershipRepository,
} from "@/adapters/organizations/in-memory.repository.ts";
import {
  InMemoryCompetitionMembershipRepository,
  InMemoryCompetitionRepository,
} from "@/adapters/competitions/in-memory.repository.ts";
import { InMemoryCompetitionEntryRepository } from "@/adapters/competitions/competition-entry.repositories.ts";
import {
  InMemoryCompetitionRosterMembershipRepository,
  InMemoryTeamRepository,
} from "@/adapters/teams/team-roster.repositories.ts";
import { InMemoryPlayerProfileRepository } from "@/adapters/teams/in-memory.repository.ts";
import { createInMemoryAuthorizationStore } from "./in-memory.repository.ts";
import { ContextualAuthorizationAdapter } from "./contextual-authorization.adapter.ts";

const now = new Date("2026-08-07T12:00:00.000Z");

async function createFixture() {
  const organizationRepository = new InMemoryOrganizationRepository();
  const organizationMemberships = new InMemoryMembershipRepository(organizationRepository);
  const competitionRepository = new InMemoryCompetitionRepository();
  const competitionMemberships = new InMemoryCompetitionMembershipRepository();
  const entries = new InMemoryCompetitionEntryRepository();
  const teams = new InMemoryTeamRepository();
  const profiles = new InMemoryPlayerProfileRepository();
  const rosters = new InMemoryCompetitionRosterMembershipRepository();
  const store = createInMemoryAuthorizationStore();

  const orgA = asOrganizationId("org-a");
  const orgB = asOrganizationId("org-b");
  const compA = asCompetitionId("comp-a");
  const compSibling = asCompetitionId("comp-sibling");
  const compB = asCompetitionId("comp-b");
  const teamA = asTeamId("team-a");
  const teamRival = asTeamId("team-rival");
  const teamB = asTeamId("team-b");
  const organizer = asActorId("organizer-a");
  const competitionStaff = asActorId("competition-staff");
  const organizationStaff = asActorId("organization-staff");
  const organizationMember = asActorId("organization-member");
  const competitionCaptain = asActorId("competition-captain");
  const competitionPlayer = asActorId("competition-player");
  const captain = asActorId("captain-a");
  const viceCaptain = asActorId("vice-captain-a");
  const rosterPlayer = asActorId("roster-player-a");
  const superuser = asActorId("superuser");

  for (const [id, name, actorId] of [
    [orgA, "Org A", organizer],
    [orgB, "Org B", asActorId("organizer-b")],
  ] as const) {
    organizationRepository.byId.set(id, {
      id,
      name,
      normalizedName: name.toLowerCase(),
      createdAt: now,
      createdByActorId: actorId,
    });
  }

  const saveCompetition = async (id: typeof compA, organizationId: typeof orgA, name: string) =>
    competitionRepository.saveDraft({
      competition: {
        id,
        organizationId,
        name,
        status: "draft",
        modality: "fc-clubs",
        gameEdition: "fc26",
        platform: "playstation",
        region: "south-america",
        timeZone: "America/Lima",
        format: "league",
        createdByActorId: organizer,
        createdAt: now,
        updatedAt: now,
      },
      rules: {
        competitionId: id,
        version: 1,
        regularStage: null,
        knockoutStage: null,
        awayGoalsEnabled: false,
        maxRosterSize: 11,
        createdAt: now,
      },
    });
  await saveCompetition(compA, orgA, "Comp A");
  await saveCompetition(compSibling, orgA, "Sibling");
  await saveCompetition(compB, orgB, "Comp B");

  for (const [id, organizationId, name] of [
    [teamA, orgA, "Team A"],
    [teamRival, orgA, "Team Rival"],
    [teamB, orgB, "Team B"],
  ] as const) {
    await teams.save({
      id,
      organizationId,
      name,
      createdAt: now,
      createdByActorId: organizer,
      creationKey: null,
    });
  }

  await organizationMemberships.add({
    organizationId: orgA,
    actorId: organizer,
    role: "organizer",
    createdAt: now,
  });
  for (const actorId of [
    competitionStaff,
    organizationMember,
    competitionCaptain,
    competitionPlayer,
    captain,
    viceCaptain,
    rosterPlayer,
  ]) {
    await organizationMemberships.add({
      organizationId: orgA,
      actorId,
      role: "member",
      createdAt: now,
    });
  }
  await organizationMemberships.add({
    organizationId: orgA,
    actorId: organizationStaff,
    role: "staff",
    createdAt: now,
  });
  await competitionMemberships.add({
    organizationId: orgA,
    competitionId: compA,
    actorId: competitionStaff,
    role: "staff",
    createdAt: now,
  });
  for (const [actorId, role] of [
    [competitionCaptain, "captain"],
    [competitionPlayer, "player"],
  ] as const) {
    await competitionMemberships.add({
      organizationId: orgA,
      competitionId: compA,
      actorId,
      role,
      createdAt: now,
    });
  }
  for (const [id, teamId] of [
    ["entry-team-a", teamA],
    ["entry-team-rival", teamRival],
  ] as const) {
    await entries.save({
      id,
      organizationId: orgA,
      competitionId: compA,
      teamId,
      status: "approved",
      createdAt: now,
      creationKey: null,
    });
  }
  for (const [actorId, role] of [
    [captain, "captain"],
    [viceCaptain, "vice_captain"],
    [rosterPlayer, "player"],
  ] as const) {
    const profile = await profiles.saveIfAbsent({
      id: `profile-${actorId}`,
      actorId,
      createdAt: now,
    });
    await rosters.add({
      id: `roster-${actorId}`,
      organizationId: orgA,
      competitionId: compA,
      teamId: teamA,
      playerProfileId: profile.id,
      gameAccountId: null,
      role,
      createdAt: now,
    });
  }
  await store.platformRoles.assignSuperuser({
    actorId: superuser,
    role: "superuser",
    assignedByActorId: superuser,
    createdAt: now,
  });

  const encounterId = asEncounterId("encounter-a");
  const authorization = new ContextualAuthorizationAdapter({
    organizations: organizationRepository,
    organizationMemberships,
    competitionMemberships,
    competitions: competitionRepository,
    entries,
    teams,
    profiles,
    rosters,
    grants: store.grants,
    platformRoles: store.platformRoles,
    encounters: {
      findById: async (id) =>
        id === encounterId
          ? {
              encounterId,
              organizationId: orgA,
              competitionId: compA,
              homeTeamId: teamA,
              awayTeamId: teamRival,
              scheduledStartAt: now,
              officialMatchCount: 2 as const,
            }
          : null,
    },
  });

  return {
    authorization,
    grants: store.grants,
    ids: { orgA, orgB, compA, compSibling, compB, teamA, teamRival, teamB, encounterId },
    actors: {
      organizer,
      competitionStaff,
      organizationStaff,
      organizationMember,
      competitionCaptain,
      competitionPlayer,
      captain,
      viceCaptain,
      rosterPlayer,
      superuser,
    },
  };
}

describe("ContextualAuthorizationAdapter", () => {
  it("isolates organization authority from another tenant", async () => {
    const fixture = await createFixture();
    const own = await fixture.authorization.decide({
      actorId: fixture.actors.organizer,
      permission: COMPETITION_PERMISSION.update,
      scope: {
        organizationId: fixture.ids.orgA,
        competitionId: fixture.ids.compA,
      },
    });
    const otherTenant = await fixture.authorization.decide({
      actorId: fixture.actors.organizer,
      permission: COMPETITION_PERMISSION.update,
      scope: {
        organizationId: fixture.ids.orgB,
        competitionId: fixture.ids.compB,
      },
    });
    expect(own.allowed).toBe(true);
    expect(otherTenant.allowed).toBe(false);
  });

  it("resolves every organization and platform role bundle", async () => {
    const fixture = await createFixture();
    const scope = { organizationId: fixture.ids.orgA, competitionId: fixture.ids.compA };
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
        scope: { organizationId: fixture.ids.orgB, competitionId: fixture.ids.compB },
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
    const fixture = await createFixture();
    const scope = { organizationId: fixture.ids.orgA, competitionId: fixture.ids.compA };
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
    const fixture = await createFixture();
    const scope = {
      organizationId: fixture.ids.orgA,
      competitionId: fixture.ids.compA,
      teamId: fixture.ids.teamA,
    };
    const captain = await fixture.authorization.decide({
      actorId: fixture.actors.captain,
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
    const fixture = await createFixture();
    const own = await fixture.authorization.decide({
      actorId: fixture.actors.rosterPlayer,
      permission: COMPETITION_PERMISSION.read,
      scope: { organizationId: fixture.ids.orgA, competitionId: fixture.ids.compA },
    });
    const sibling = await fixture.authorization.decide({
      actorId: fixture.actors.rosterPlayer,
      permission: COMPETITION_PERMISSION.read,
      scope: { organizationId: fixture.ids.orgA, competitionId: fixture.ids.compSibling },
    });
    expect(own.allowed).toBe(true);
    expect(sibling.allowed).toBe(false);
  });

  it("keeps competition staff inside its competition", async () => {
    const fixture = await createFixture();
    const own = await fixture.authorization.decide({
      actorId: fixture.actors.competitionStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: { organizationId: fixture.ids.orgA, competitionId: fixture.ids.compA },
    });
    const sibling = await fixture.authorization.decide({
      actorId: fixture.actors.competitionStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: {
        organizationId: fixture.ids.orgA,
        competitionId: fixture.ids.compSibling,
      },
    });
    expect(own.allowed).toBe(true);
    expect(sibling.allowed).toBe(false);
  });

  it("allows a captain to manage only its roster Team", async () => {
    const fixture = await createFixture();
    const ownTeam = await fixture.authorization.decide({
      actorId: fixture.actors.captain,
      permission: TEAM_PERMISSION.rosterManage,
      scope: {
        organizationId: fixture.ids.orgA,
        competitionId: fixture.ids.compA,
        teamId: fixture.ids.teamA,
      },
    });
    const rival = await fixture.authorization.decide({
      actorId: fixture.actors.captain,
      permission: TEAM_PERMISSION.rosterManage,
      scope: {
        organizationId: fixture.ids.orgA,
        competitionId: fixture.ids.compA,
        teamId: fixture.ids.teamRival,
      },
    });
    expect(ownTeam.allowed).toBe(true);
    expect(rival.allowed).toBe(false);
  });

  it("applies deny in the same scope and lets a more-specific allow override it", async () => {
    const fixture = await createFixture();
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
      createdAt: now,
      updatedAt: now,
    });
    const denied = await fixture.authorization.decide({
      actorId: fixture.actors.organizationStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: { organizationId: fixture.ids.orgA, competitionId: fixture.ids.compA },
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
      createdAt: now,
      updatedAt: now,
    });
    const allowed = await fixture.authorization.decide({
      actorId: fixture.actors.organizationStaff,
      permission: COMPETITION_PERMISSION.update,
      scope: { organizationId: fixture.ids.orgA, competitionId: fixture.ids.compA },
    });
    expect(denied.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it("derives encounter authority only from a participating Team", async () => {
    const fixture = await createFixture();
    const participant = await fixture.authorization.decide({
      actorId: fixture.actors.captain,
      permission: "encounters.official-selection.propose",
      scope: {
        organizationId: fixture.ids.orgA,
        competitionId: fixture.ids.compA,
        encounterId: fixture.ids.encounterId,
      },
    });
    const wrongTeam = await fixture.authorization.decide({
      actorId: fixture.actors.captain,
      permission: "encounters.official-selection.propose",
      scope: {
        organizationId: fixture.ids.orgA,
        competitionId: fixture.ids.compA,
        teamId: fixture.ids.teamB,
        encounterId: fixture.ids.encounterId,
      },
    });
    expect(participant.allowed).toBe(true);
    expect(wrongTeam.allowed).toBe(false);
    expect(wrongTeam.reason).toBe("scope-mismatch");
  });
});
