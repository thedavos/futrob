import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import type { CompetitionEntry } from "@futrob/competitions";
import {
  TeamAuthorizationForbidden,
  type CompetitionRosterMembership,
  type CompetitionRosterState,
  type ExternalClubConnection,
  type PlayerGameAccount,
  type Team,
} from "@futrob/teams";
import {
  GetTeamRosterManagementUseCase,
  ListTeamRosterManagementUseCase,
  type TeamRosterManagementDependencies,
} from "./team-roster-management.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const actorId = asActorId("actor-1");

function team(id: string, name: string, organization = organizationId): Team {
  return {
    id: asTeamId(id),
    organizationId: organization,
    name,
    createdAt: new Date("2026-08-11T12:00:00.000Z"),
    createdByActorId: actorId,
    creationKey: null,
  };
}

function entry(id: string, teamId: string): CompetitionEntry {
  return {
    id,
    organizationId,
    competitionId,
    teamId: asTeamId(teamId),
    status: "pending",
    createdAt: new Date("2026-08-11T12:00:00.000Z"),
    creationKey: null,
  };
}

function dependencies(input?: {
  readonly teams?: readonly Team[];
  readonly entries?: readonly CompetitionEntry[];
  readonly deniedTeamIds?: readonly string[];
  readonly memberships?: readonly CompetitionRosterMembership[];
  readonly state?: CompetitionRosterState | null;
  readonly connection?: ExternalClubConnection | null;
  readonly accounts?: readonly PlayerGameAccount[];
}): TeamRosterManagementDependencies {
  const teams = input?.teams ?? [team("team-1", "Barranco FC")];
  const entries = input?.entries ?? [entry("entry-1", "team-1")];
  const denied = new Set(input?.deniedTeamIds ?? []);
  const authorization: AuthorizationPort = {
    async decide(request) {
      return {
        allowed: request.scope.teamId ? !denied.has(request.scope.teamId) : true,
        permission: request.permission,
        scope: request.scope,
        reason: request.scope.teamId && denied.has(request.scope.teamId) ? "denied" : "allowed",
      };
    },
    async getEffectiveAccess(request) {
      return { actorId: request.actorId, scope: request.scope, roles: [], permissions: [] };
    },
  };
  return {
    authorization,
    entries: {
      list: async () => entries,
      find: async (organization, competition, teamId) =>
        entries.find(
          (candidate) =>
            candidate.organizationId === organization &&
            candidate.competitionId === competition &&
            candidate.teamId === teamId,
        ) ?? null,
    },
    teams: {
      find: async (organization, id) =>
        teams.find(
          (candidate) => candidate.organizationId === organization && candidate.id === id,
        ) ?? null,
    },
    rosters: { list: async () => input?.memberships ?? [] },
    rosterStates: { get: async () => input?.state ?? null },
    externalClubs: { get: async () => input?.connection ?? null },
    capacity: { getMaxRosterSize: async () => 11 },
    accounts: {
      listByProfile: async (profileId) =>
        (input?.accounts ?? []).filter((account) => account.playerProfileId === profileId),
    },
  };
}

describe("ListTeamRosterManagementUseCase", () => {
  it("sorts by normalized team name and pages with a stable cursor", async () => {
    const useCase = new ListTeamRosterManagementUseCase(
      dependencies({
        teams: [team("team-z", "Zorros"), team("team-a", "Águilas"), team("team-b", "Aguilas")],
        entries: [
          entry("entry-z", "team-z"),
          entry("entry-a", "team-a"),
          entry("entry-b", "team-b"),
        ],
      }),
    );

    const first = await useCase.execute({ actorId, organizationId, competitionId, limit: 2 });
    expect(first.items.map((item) => item.team.id)).toEqual(["team-a", "team-b"]);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await useCase.execute({
      actorId,
      organizationId,
      competitionId,
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.items.map((item) => item.team.id)).toEqual(["team-z"]);
    expect(second.nextCursor).toBeUndefined();
  });

  it("omits teams outside the tenant and teams the actor cannot read", async () => {
    const useCase = new ListTeamRosterManagementUseCase(
      dependencies({
        teams: [
          team("team-1", "Visible"),
          team("team-2", "Denied"),
          team("team-3", "Other tenant", asOrganizationId("org-2")),
        ],
        entries: [
          entry("entry-1", "team-1"),
          entry("entry-2", "team-2"),
          entry("entry-3", "team-3"),
        ],
        deniedTeamIds: ["team-2"],
      }),
    );

    const result = await useCase.execute({ actorId, organizationId, competitionId, limit: 25 });
    expect(result.items.map((item) => item.team.id)).toEqual(["team-1"]);
  });
});

describe("GetTeamRosterManagementUseCase", () => {
  it("returns explicit roster state, capacity, club, and server presentation", async () => {
    const membership: CompetitionRosterMembership = {
      id: "membership-1",
      organizationId,
      competitionId,
      teamId: asTeamId("team-1"),
      playerProfileId: "profile-1",
      gameAccountId: "account-1",
      role: "captain",
      createdAt: new Date("2026-08-11T12:00:00.000Z"),
    };
    const useCase = new GetTeamRosterManagementUseCase(
      dependencies({
        memberships: [membership],
        state: {
          organizationId,
          competitionId,
          teamId: asTeamId("team-1"),
          lockedAt: new Date("2026-08-11T13:00:00.000Z"),
        },
        connection: {
          teamId: asTeamId("team-1"),
          providerKey: "ea-clubs",
          externalClubId: "club-1",
          externalClubName: "Fera",
          platform: "common-gen5",
          gameEdition: "FC 26",
        },
        accounts: [
          {
            id: "account-1",
            playerProfileId: "profile-1",
            identifier: "Capitana10",
            normalizedIdentifier: "capitana10",
            providerExternalPlayerId: null,
            platform: "playstation",
            gameEdition: "FC 26",
            createdAt: new Date("2026-08-11T12:00:00.000Z"),
          },
        ],
      }),
    );

    const result = await useCase.execute({
      actorId,
      organizationId,
      competitionId,
      teamId: asTeamId("team-1"),
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.roster).toMatchObject({ state: "closed", memberCount: 1, maxSize: 11 });
    expect(result.value.members[0]?.presentation).toEqual({
      displayName: "Capitana10",
      avatarUrl: null,
    });
  });

  it("looks up the Team entry directly and leaves unnamed members without copy", async () => {
    const membership: CompetitionRosterMembership = {
      id: "membership-1",
      organizationId,
      competitionId,
      teamId: asTeamId("team-1"),
      playerProfileId: "profile-1",
      gameAccountId: null,
      role: "player",
      createdAt: new Date("2026-08-11T12:00:00.000Z"),
    };
    const deps = dependencies({ memberships: [membership] });
    deps.entries.list = async () => {
      throw new Error("Get must not list every competition entry");
    };
    const useCase = new GetTeamRosterManagementUseCase(deps);

    const result = await useCase.execute({
      actorId,
      organizationId,
      competitionId,
      teamId: asTeamId("team-1"),
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.members[0]?.presentation.displayName).toBeNull();
  });

  it("fails closed without revealing whether a denied team exists", async () => {
    const useCase = new GetTeamRosterManagementUseCase(dependencies({ deniedTeamIds: ["team-1"] }));
    const result = await useCase.execute({
      actorId,
      organizationId,
      competitionId,
      teamId: asTeamId("team-1"),
    });
    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(TeamAuthorizationForbidden.is(result.error)).toBe(true);
  });
});
