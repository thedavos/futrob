import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type AuthorizationScope,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
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

export const RBAC_MATRIX_NOW = new Date("2026-08-07T12:00:00.000Z");

export type RbacActorKey =
  | "superuser"
  | "organizer"
  | "organizationStaff"
  | "organizationMember"
  | "competitionStaff"
  | "competitionCaptain"
  | "competitionPlayer"
  | "rosterCaptain"
  | "viceCaptain"
  | "rosterPlayer"
  | "rivalCaptain"
  | "outsider"
  | "organizerB";

export type RbacScopeKey =
  | "orgA"
  | "orgB"
  | "orgA.compA"
  | "orgA.compSibling"
  | "orgB.compB"
  | "orgA.compA.teamA"
  | "orgA.compA.teamRival"
  | "orgA.compA.teamB"
  | "orgA.compA.encounter"
  | "orgA.compA.teamA.encounter"
  | "orgA.compA.teamRival.encounter"
  | "orgA.compA.teamB.encounter"
  | "orgA.compSibling.encounter"
  | "platform";

export type RbacMatrixIds = {
  readonly orgA: OrganizationId;
  readonly orgB: OrganizationId;
  readonly compA: CompetitionId;
  readonly compSibling: CompetitionId;
  readonly compB: CompetitionId;
  readonly teamA: TeamId;
  readonly teamRival: TeamId;
  readonly teamB: TeamId;
  readonly encounterId: EncounterId;
  readonly siblingEncounterId: EncounterId;
};

export type RbacMatrixFixture = {
  readonly authorization: ContextualAuthorizationAdapter;
  readonly grants: ReturnType<typeof createInMemoryAuthorizationStore>["grants"];
  readonly ids: RbacMatrixIds;
  readonly actors: Record<RbacActorKey, ActorId>;
  readonly scope: (key: RbacScopeKey) => AuthorizationScope;
};

export async function createRbacMatrixFixture(): Promise<RbacMatrixFixture> {
  const organizationRepository = new InMemoryOrganizationRepository();
  const organizationMemberships = new InMemoryMembershipRepository(organizationRepository);
  const competitionRepository = new InMemoryCompetitionRepository();
  const competitionMemberships = new InMemoryCompetitionMembershipRepository();
  const entries = new InMemoryCompetitionEntryRepository();
  const teams = new InMemoryTeamRepository();
  const profiles = new InMemoryPlayerProfileRepository();
  const rosters = new InMemoryCompetitionRosterMembershipRepository();
  const store = createInMemoryAuthorizationStore();

  const ids: RbacMatrixIds = {
    orgA: asOrganizationId("org-a"),
    orgB: asOrganizationId("org-b"),
    compA: asCompetitionId("comp-a"),
    compSibling: asCompetitionId("comp-sibling"),
    compB: asCompetitionId("comp-b"),
    teamA: asTeamId("team-a"),
    teamRival: asTeamId("team-rival"),
    teamB: asTeamId("team-b"),
    encounterId: asEncounterId("encounter-a"),
    siblingEncounterId: asEncounterId("encounter-sibling"),
  };

  const actors: Record<RbacActorKey, ActorId> = {
    superuser: asActorId("superuser"),
    organizer: asActorId("organizer-a"),
    organizationStaff: asActorId("organization-staff"),
    organizationMember: asActorId("organization-member"),
    competitionStaff: asActorId("competition-staff"),
    competitionCaptain: asActorId("competition-captain"),
    competitionPlayer: asActorId("competition-player"),
    rosterCaptain: asActorId("captain-a"),
    viceCaptain: asActorId("vice-captain-a"),
    rosterPlayer: asActorId("roster-player-a"),
    rivalCaptain: asActorId("rival-captain-a"),
    outsider: asActorId("outsider"),
    organizerB: asActorId("organizer-b"),
  };

  for (const [id, name, actorId] of [
    [ids.orgA, "Org A", actors.organizer],
    [ids.orgB, "Org B", actors.organizerB],
  ] as const) {
    organizationRepository.byId.set(id, {
      id,
      name,
      normalizedName: name.toLowerCase(),
      createdAt: RBAC_MATRIX_NOW,
      createdByActorId: actorId,
    });
  }

  const saveCompetition = async (id: CompetitionId, organizationId: OrganizationId, name: string) =>
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
        createdByActorId: actors.organizer,
        createdAt: RBAC_MATRIX_NOW,
        updatedAt: RBAC_MATRIX_NOW,
      },
      rules: {
        competitionId: id,
        version: 1,
        regularStage: null,
        knockoutStage: null,
        awayGoalsEnabled: false,
        maxRosterSize: 11,
        createdAt: RBAC_MATRIX_NOW,
      },
    });

  await saveCompetition(ids.compA, ids.orgA, "Comp A");
  await saveCompetition(ids.compSibling, ids.orgA, "Sibling");
  await saveCompetition(ids.compB, ids.orgB, "Comp B");

  for (const [id, organizationId, name] of [
    [ids.teamA, ids.orgA, "Team A"],
    [ids.teamRival, ids.orgA, "Team Rival"],
    [ids.teamB, ids.orgB, "Team B"],
  ] as const) {
    await teams.save({
      id,
      organizationId,
      name,
      createdAt: RBAC_MATRIX_NOW,
      createdByActorId: actors.organizer,
      creationKey: null,
    });
  }

  await organizationMemberships.add({
    organizationId: ids.orgA,
    actorId: actors.organizer,
    role: "organizer",
    createdAt: RBAC_MATRIX_NOW,
  });
  await organizationMemberships.add({
    organizationId: ids.orgB,
    actorId: actors.organizerB,
    role: "organizer",
    createdAt: RBAC_MATRIX_NOW,
  });
  await organizationMemberships.add({
    organizationId: ids.orgA,
    actorId: actors.organizationStaff,
    role: "staff",
    createdAt: RBAC_MATRIX_NOW,
  });

  for (const actorId of [
    actors.organizationMember,
    actors.competitionStaff,
    actors.competitionCaptain,
    actors.competitionPlayer,
    actors.rosterCaptain,
    actors.viceCaptain,
    actors.rosterPlayer,
    actors.rivalCaptain,
  ]) {
    await organizationMemberships.add({
      organizationId: ids.orgA,
      actorId,
      role: "member",
      createdAt: RBAC_MATRIX_NOW,
    });
  }

  await competitionMemberships.add({
    organizationId: ids.orgA,
    competitionId: ids.compA,
    actorId: actors.competitionStaff,
    role: "staff",
    createdAt: RBAC_MATRIX_NOW,
  });
  for (const [actorId, role] of [
    [actors.competitionCaptain, "captain"],
    [actors.competitionPlayer, "player"],
  ] as const) {
    await competitionMemberships.add({
      organizationId: ids.orgA,
      competitionId: ids.compA,
      actorId,
      role,
      createdAt: RBAC_MATRIX_NOW,
    });
  }

  for (const [id, teamId] of [
    ["entry-team-a", ids.teamA],
    ["entry-team-rival", ids.teamRival],
  ] as const) {
    await entries.save({
      id,
      organizationId: ids.orgA,
      competitionId: ids.compA,
      teamId,
      status: "approved",
      createdAt: RBAC_MATRIX_NOW,
      creationKey: null,
    });
  }

  for (const [actorId, teamId, role] of [
    [actors.rosterCaptain, ids.teamA, "captain"],
    [actors.viceCaptain, ids.teamA, "vice_captain"],
    [actors.rosterPlayer, ids.teamA, "player"],
    [actors.rivalCaptain, ids.teamRival, "captain"],
  ] as const) {
    const profile = await profiles.saveIfAbsent({
      id: `profile-${actorId}`,
      actorId,
      createdAt: RBAC_MATRIX_NOW,
    });
    await rosters.add({
      id: `roster-${actorId}`,
      organizationId: ids.orgA,
      competitionId: ids.compA,
      teamId,
      playerProfileId: profile.id,
      gameAccountId: null,
      role,
      createdAt: RBAC_MATRIX_NOW,
    });
  }

  await store.platformRoles.assignSuperuser({
    actorId: actors.superuser,
    role: "superuser",
    assignedByActorId: actors.superuser,
    createdAt: RBAC_MATRIX_NOW,
  });

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
      findById: async (id) => {
        if (id === ids.encounterId) {
          return {
            encounterId: ids.encounterId,
            organizationId: ids.orgA,
            competitionId: ids.compA,
            homeTeamId: ids.teamA,
            awayTeamId: ids.teamRival,
            scheduledStartAt: RBAC_MATRIX_NOW,
            officialMatchCount: 2 as const,
          };
        }
        if (id === ids.siblingEncounterId) {
          return {
            encounterId: ids.siblingEncounterId,
            organizationId: ids.orgA,
            competitionId: ids.compSibling,
            homeTeamId: ids.teamA,
            awayTeamId: ids.teamRival,
            scheduledStartAt: RBAC_MATRIX_NOW,
            officialMatchCount: 2 as const,
          };
        }
        return null;
      },
    },
  });

  const scope = (key: RbacScopeKey): AuthorizationScope => {
    switch (key) {
      case "platform":
        return {};
      case "orgA":
        return { organizationId: ids.orgA };
      case "orgB":
        return { organizationId: ids.orgB };
      case "orgA.compA":
        return { organizationId: ids.orgA, competitionId: ids.compA };
      case "orgA.compSibling":
        return { organizationId: ids.orgA, competitionId: ids.compSibling };
      case "orgB.compB":
        return { organizationId: ids.orgB, competitionId: ids.compB };
      case "orgA.compA.teamA":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compA,
          teamId: ids.teamA,
        };
      case "orgA.compA.teamRival":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compA,
          teamId: ids.teamRival,
        };
      case "orgA.compA.teamB":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compA,
          teamId: ids.teamB,
        };
      case "orgA.compA.encounter":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compA,
          encounterId: ids.encounterId,
        };
      case "orgA.compA.teamA.encounter":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compA,
          teamId: ids.teamA,
          encounterId: ids.encounterId,
        };
      case "orgA.compA.teamRival.encounter":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compA,
          teamId: ids.teamRival,
          encounterId: ids.encounterId,
        };
      case "orgA.compA.teamB.encounter":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compA,
          teamId: ids.teamB,
          encounterId: ids.encounterId,
        };
      case "orgA.compSibling.encounter":
        return {
          organizationId: ids.orgA,
          competitionId: ids.compSibling,
          encounterId: ids.siblingEncounterId,
        };
    }
  };

  return { authorization, grants: store.grants, ids, actors, scope };
}
