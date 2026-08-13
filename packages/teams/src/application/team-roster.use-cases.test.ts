import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import {
  ActiveTeamNotOwned,
  GameAccountNotFound,
  RosterCompetitionConflict,
  RosterFull,
  RosterLocked,
  RosterEntryInactive,
} from "../domain/errors/team.errors.ts";
import type { ActiveTeamPreference } from "../domain/entities/active-team-preference.ts";
import type { CompetitionRosterMembership } from "../domain/entities/competition-roster-membership.ts";
import type { CompetitionRosterState } from "../domain/entities/competition-roster-state.ts";
import type { ExternalClubConnection } from "../domain/entities/external-club-connection.ts";
import type { PlayerGameAccount } from "../domain/entities/player-game-account.ts";
import type { PlayerProfile } from "../domain/entities/player-profile.ts";
import type { Team } from "../domain/entities/team.ts";
import type { ActiveTeamPreferenceRepository } from "../domain/ports/active-team-preference.repository.ts";
import type { CompetitionRosterMembershipRepository } from "../domain/ports/competition-roster-membership.repository.ts";
import type { CompetitionRosterStateRepository } from "../domain/ports/competition-roster-state.repository.ts";
import type { ExternalClubConnectionRepository } from "../domain/ports/external-club-connection.repository.ts";
import type { PlayerGameAccountRepository } from "../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../domain/ports/player-profile.repository.ts";
import type { RosterCapacityPort } from "../domain/ports/roster-capacity.port.ts";
import type {
  RosterMutationPort,
  RosterMutationScope,
} from "../domain/ports/roster-mutation.port.ts";
import type { TeamRepository } from "../domain/ports/team.repository.ts";
import {
  AddToRosterUseCase,
  type AddToRosterInput,
} from "./add-to-roster/add-to-roster.use-case.ts";
import { ChangeRosterRoleUseCase } from "./change-roster-role/change-roster-role.use-case.ts";
import { CloseRosterUseCase, type CloseRosterInput } from "./close-roster/close-roster.use-case.ts";
import { ConnectTeamExternalClubUseCase } from "./connect-team-external-club/connect-team-external-club.use-case.ts";
import { CreateTeamUseCase } from "./create-team/create-team.use-case.ts";
import { GetActiveTeamUseCase } from "./get-active-team/get-active-team.use-case.ts";
import { GetTeamExternalClubUseCase } from "./get-team-external-club/get-team-external-club.use-case.ts";
import { ListRostersForPlayerUseCase } from "./list-rosters-for-player/list-rosters-for-player.use-case.ts";
import { OpenRosterUseCase } from "./open-roster/open-roster.use-case.ts";
import { SetActiveTeamUseCase } from "./set-active-team/set-active-team.use-case.ts";

class Teams implements TeamRepository {
  rows: Team[] = [];
  async findById(organizationId: Team["organizationId"], teamId: Team["id"]) {
    return (
      this.rows.find((row) => row.id === teamId && row.organizationId === organizationId) ?? null
    );
  }
  async findByCreationKey(creationKey: string) {
    return this.rows.find((row) => row.creationKey === creationKey) ?? null;
  }
  async save(team: Team) {
    this.rows.push(team);
    return team;
  }
}

class Rosters implements CompetitionRosterMembershipRepository {
  rows: CompetitionRosterMembership[] = [];
  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async findByIdInScope(
    organizationId: CompetitionRosterMembership["organizationId"],
    competitionId: CompetitionRosterMembership["competitionId"],
    teamId: CompetitionRosterMembership["teamId"],
    id: string,
  ) {
    return (
      this.rows.find(
        (row) =>
          row.id === id &&
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.teamId === teamId,
      ) ?? null
    );
  }
  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionRosterMembership["competitionId"],
  ) {
    return (
      this.rows.find(
        (row) => row.playerProfileId === playerProfileId && row.competitionId === competitionId,
      ) ?? null
    );
  }
  async findByTeamPlayerCompetition(
    teamId: CompetitionRosterMembership["teamId"],
    playerProfileId: string,
    competitionId: CompetitionRosterMembership["competitionId"],
  ) {
    return (
      this.rows.find(
        (row) =>
          row.teamId === teamId &&
          row.playerProfileId === playerProfileId &&
          row.competitionId === competitionId,
      ) ?? null
    );
  }
  async listByPlayerProfile(playerProfileId: string) {
    return this.rows.filter((row) => row.playerProfileId === playerProfileId);
  }
  async listByTeam(
    organizationId: CompetitionRosterMembership["organizationId"],
    competitionId: CompetitionRosterMembership["competitionId"],
    teamId: CompetitionRosterMembership["teamId"],
  ) {
    return this.rows.filter(
      (row) =>
        row.organizationId === organizationId &&
        row.competitionId === competitionId &&
        row.teamId === teamId,
    );
  }
  async add(membership: CompetitionRosterMembership) {
    const existing = await this.findByPlayerAndCompetition(
      membership.playerProfileId,
      membership.competitionId,
    );
    if (existing && existing.teamId !== membership.teamId) return null;
    if (existing) return existing;
    this.rows.push(membership);
    return membership;
  }
  async update(membership: CompetitionRosterMembership) {
    const index = this.rows.findIndex((row) => row.id === membership.id);
    if (index >= 0) this.rows[index] = membership;
    return membership;
  }
}

class RosterStates implements CompetitionRosterStateRepository {
  rows = new Map<string, CompetitionRosterState>();
  key(state: CompetitionRosterState) {
    return `${state.organizationId}:${state.competitionId}:${state.teamId}`;
  }
  async get(
    organizationId: CompetitionRosterState["organizationId"],
    competitionId: CompetitionRosterState["competitionId"],
    teamId: CompetitionRosterState["teamId"],
  ) {
    return (
      this.rows.get(this.key({ organizationId, competitionId, teamId, lockedAt: null })) ?? null
    );
  }
  async save(state: CompetitionRosterState) {
    this.rows.set(this.key(state), state);
    return state;
  }
}

class Capacity implements RosterCapacityPort {
  constructor(private readonly maxSize = 11) {}
  async getMaxRosterSize() {
    return this.maxSize;
  }
}

class Connections implements ExternalClubConnectionRepository {
  rows = new Map<string, ExternalClubConnection>();
  async findByTeam(teamId: ExternalClubConnection["teamId"]) {
    return this.rows.get(teamId) ?? null;
  }
  async upsert(connection: ExternalClubConnection) {
    this.rows.set(connection.teamId, connection);
    return connection;
  }
}

class Profiles implements PlayerProfileRepository {
  rows: PlayerProfile[] = [];
  async findById(playerProfileId: string) {
    return this.rows.find((row) => row.id === playerProfileId) ?? null;
  }
  async findByActor(actorId: PlayerProfile["actorId"]) {
    return this.rows.find((row) => row.actorId === actorId) ?? null;
  }
  async saveIfAbsent(profile: PlayerProfile) {
    const existing = await this.findByActor(profile.actorId);
    if (existing) return existing;
    this.rows.push(profile);
    return profile;
  }
}

class Accounts implements PlayerGameAccountRepository {
  rows: PlayerGameAccount[] = [];
  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async listByProfile(playerProfileId: string) {
    return this.rows.filter((row) => row.playerProfileId === playerProfileId);
  }
  async saveIfAbsent(account: PlayerGameAccount) {
    this.rows.push(account);
    return account;
  }
  async setProviderExternalPlayerId(input: {
    readonly accountId: string;
    readonly providerExternalPlayerId: string;
  }) {
    const index = this.rows.findIndex((row) => row.id === input.accountId);
    if (index < 0) return null;
    const updated = {
      ...this.rows[index],
      providerExternalPlayerId: input.providerExternalPlayerId,
    };
    this.rows[index] = updated;
    return updated;
  }
  async findByCorrelation(input: {
    readonly platform: PlayerGameAccount["platform"];
    readonly gameEdition: string;
    readonly providerExternalPlayerId?: string;
    readonly normalizedIdentifier?: string;
  }) {
    return this.rows.filter(
      (row) =>
        row.platform === input.platform &&
        row.gameEdition === input.gameEdition &&
        ((input.providerExternalPlayerId !== undefined &&
          row.providerExternalPlayerId === input.providerExternalPlayerId) ||
          (input.normalizedIdentifier !== undefined &&
            row.normalizedIdentifier === input.normalizedIdentifier)),
    );
  }
}

class Preferences implements ActiveTeamPreferenceRepository {
  rows = new Map<string, ActiveTeamPreference>();
  async findByActor(actorId: ActiveTeamPreference["actorId"]) {
    return this.rows.get(actorId) ?? null;
  }
  async save(preference: ActiveTeamPreference) {
    this.rows.set(preference.actorId, preference);
    return preference;
  }
}

const allowAllAuthorization: import("@futrob/shared-kernel").AuthorizationPort = {
  decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
  getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
};

class SerialRosterMutations implements RosterMutationPort {
  private tail = Promise.resolve();

  async runExclusive<T>(_scope: RosterMutationScope, operation: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release: () => void = () => undefined;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

function shared() {
  let sequence = 0;
  return {
    clock: { now: () => new Date("2026-08-01T12:00:00.000Z") },
    ids: { generate: () => `id-${++sequence}` },
    authorization: allowAllAuthorization,
  };
}

function rosterDeps(options?: { maxSize?: number }) {
  const teams = new Teams();
  const rosters = new Rosters();
  const rosterStates = new RosterStates();
  const capacity = new Capacity(options?.maxSize ?? 11);
  const accounts = new Accounts();
  const mutations = new SerialRosterMutations();
  const entryGate = { canMutateRoster: async () => true };
  const deps = {
    teams,
    rosters,
    rosterStates,
    capacity,
    entryGate,
    accounts,
    mutations,
    ...shared(),
  };
  const addToRoster = new AddToRosterUseCase(deps);
  const closeRoster = new CloseRosterUseCase({
    teams,
    rosterStates,
    clock: deps.clock,
    authorization: allowAllAuthorization,
    mutations,
  });
  const openRoster = new OpenRosterUseCase({
    teams,
    rosterStates,
    authorization: allowAllAuthorization,
    mutations,
  });
  return {
    ...deps,
    addToRoster: {
      execute: (input: Omit<AddToRosterInput, "actorId">) =>
        addToRoster.execute({ actorId: asActorId("manager"), ...input }),
    },
    changeRole: new ChangeRosterRoleUseCase({
      authorization: allowAllAuthorization,
      rosters,
      mutations,
    }),
    closeRoster: {
      execute: (input: Omit<CloseRosterInput, "actorId">) =>
        closeRoster.execute({ actorId: asActorId("manager"), ...input }),
    },
    openRoster: {
      execute: (input: Omit<CloseRosterInput, "actorId">) =>
        openRoster.execute({ actorId: asActorId("manager"), ...input }),
    },
  };
}

describe("team and roster use cases", () => {
  it("creates a team idempotently by creation key", async () => {
    const teams = new Teams();
    const useCase = new CreateTeamUseCase({ teams, ...shared() });
    const input = {
      organizationId: asOrganizationId("org-1"),
      actorId: asActorId("actor-1"),
      name: "FC Alpha",
      creationKey: "team:org-1:alpha",
    };
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(first.isOk() && second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;
    expect(second.value.id).toBe(first.value.id);
    expect(teams.rows).toHaveLength(1);
  });

  it("allows the same player on teams in different competitions and rejects a second team in one competition", async () => {
    const { teams, rosters, addToRoster } = rosterDeps();
    const createTeam = new CreateTeamUseCase({ teams, ...shared() });
    const orgId = asOrganizationId("org-1");
    const teamA = await createTeam.execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Team A",
    });
    const teamB = await createTeam.execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Team B",
    });
    const teamC = await createTeam.execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Team C",
    });
    expect(teamA.isOk() && teamB.isOk() && teamC.isOk()).toBe(true);
    if (!teamA.isOk() || !teamB.isOk() || !teamC.isOk()) return;

    const first = await addToRoster.execute({
      organizationId: orgId,
      competitionId: asCompetitionId("comp-1"),
      teamId: teamA.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    const across = await addToRoster.execute({
      organizationId: orgId,
      competitionId: asCompetitionId("comp-2"),
      teamId: teamB.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    const conflict = await addToRoster.execute({
      organizationId: orgId,
      competitionId: asCompetitionId("comp-1"),
      teamId: teamC.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    const retry = await addToRoster.execute({
      organizationId: orgId,
      competitionId: asCompetitionId("comp-1"),
      teamId: teamA.value.id,
      playerProfileId: "profile-1",
      role: "captain",
    });

    expect(first.isOk() && across.isOk()).toBe(true);
    expect(conflict.isOk()).toBe(false);
    expect(!conflict.isOk() && RosterCompetitionConflict.is(conflict.error)).toBe(true);
    expect(retry.isOk() && first.isOk() && retry.value.id).toBe(first.isOk() ? first.value.id : "");
    expect(
      await new ListRostersForPlayerUseCase(rosters).execute({ playerProfileId: "profile-1" }),
    ).toHaveLength(2);
  });

  it("sets active team only for a membership owned by the actor", async () => {
    const { teams, rosters, addToRoster } = rosterDeps();
    const profiles = new Profiles();
    const preferences = new Preferences();
    const deps = shared();
    await profiles.saveIfAbsent({
      id: "profile-1",
      actorId: asActorId("actor-1"),
      createdAt: deps.clock.now(),
    });
    const team = await new CreateTeamUseCase({ teams, ...deps }).execute({
      organizationId: asOrganizationId("org-1"),
      actorId: asActorId("actor-1"),
      name: "Active FC",
    });
    expect(team.isOk()).toBe(true);
    if (!team.isOk()) return;
    const membership = await addToRoster.execute({
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("comp-1"),
      teamId: team.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    expect(membership.isOk()).toBe(true);
    if (!membership.isOk()) return;

    const setActive = new SetActiveTeamUseCase({
      profiles,
      rosters,
      preferences,
      clock: deps.clock,
    });
    const saved = await setActive.execute({
      actorId: asActorId("actor-1"),
      rosterMembershipId: membership.value.id,
    });
    const foreign = await setActive.execute({
      actorId: asActorId("actor-1"),
      rosterMembershipId: "missing",
    });
    expect(saved.isOk()).toBe(true);
    expect(foreign.isOk()).toBe(false);
    expect(!foreign.isOk() && ActiveTeamNotOwned.is(foreign.error)).toBe(true);
    expect(
      await new GetActiveTeamUseCase(preferences).execute({ actorId: asActorId("actor-1") }),
    ).toMatchObject({ rosterMembershipId: membership.value.id });
  });

  it("rejects a game account that does not belong to the player profile", async () => {
    const { teams, addToRoster } = rosterDeps();
    const deps = shared();
    const team = await new CreateTeamUseCase({ teams, ...deps }).execute({
      organizationId: asOrganizationId("org-1"),
      actorId: asActorId("actor-1"),
      name: "Bound FC",
    });
    expect(team.isOk()).toBe(true);
    if (!team.isOk()) return;
    const result = await addToRoster.execute({
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("comp-1"),
      teamId: team.value.id,
      playerProfileId: "profile-1",
      gameAccountId: "account-x",
      role: "player",
    });
    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && GameAccountNotFound.is(result.error)).toBe(true);
    expect(asTeamId(team.value.id)).toBe(team.value.id);
  });

  it("rejects add when roster is full", async () => {
    const { teams, addToRoster } = rosterDeps({ maxSize: 1 });
    const createTeam = new CreateTeamUseCase({ teams, ...shared() });
    const orgId = asOrganizationId("org-1");
    const compId = asCompetitionId("comp-1");
    const team = await createTeam.execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Full FC",
    });
    expect(team.isOk()).toBe(true);
    if (!team.isOk()) return;
    const first = await addToRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    const second = await addToRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
      playerProfileId: "profile-2",
      role: "player",
    });
    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(false);
    expect(!second.isOk() && RosterFull.is(second.error)).toBe(true);
  });

  it("blocks add after roster is locked", async () => {
    const { teams, addToRoster, closeRoster } = rosterDeps();
    const deps = shared();
    const orgId = asOrganizationId("org-1");
    const compId = asCompetitionId("comp-1");
    const team = await new CreateTeamUseCase({ teams, ...deps }).execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Locked FC",
    });
    expect(team.isOk()).toBe(true);
    if (!team.isOk()) return;
    await addToRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    const closed = await closeRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
    });
    expect(closed.isOk()).toBe(true);
    const blocked = await addToRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
      playerProfileId: "profile-2",
      role: "player",
    });
    expect(blocked.isOk()).toBe(false);
    expect(!blocked.isOk() && RosterLocked.is(blocked.error)).toBe(true);
  });

  it("orders concurrent close and open mutations for the same roster", async () => {
    const { teams, closeRoster, openRoster, rosterStates } = rosterDeps();
    const orgId = asOrganizationId("org-1");
    const compId = asCompetitionId("comp-1");
    const team = await new CreateTeamUseCase({ teams, ...shared() }).execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Ordered FC",
    });
    if (!team.isOk()) throw team.error;
    const input = { organizationId: orgId, competitionId: compId, teamId: team.value.id };

    const [closed, opened] = await Promise.all([
      closeRoster.execute(input),
      openRoster.execute(input),
    ]);

    expect(closed.isOk()).toBe(true);
    expect(opened.isOk()).toBe(true);
    expect((await rosterStates.get(orgId, compId, team.value.id))?.lockedAt).toBeNull();
  });

  it("demotes the previous captain when promoting a new one", async () => {
    const { teams, rosters, addToRoster, changeRole } = rosterDeps();
    const orgId = asOrganizationId("org-1");
    const compId = asCompetitionId("comp-1");
    const team = await new CreateTeamUseCase({ teams, ...shared() }).execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Captain FC",
    });
    expect(team.isOk()).toBe(true);
    if (!team.isOk()) return;
    const captain = await addToRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
      playerProfileId: "profile-1",
      role: "captain",
    });
    const player = await addToRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
      playerProfileId: "profile-2",
      role: "player",
    });
    expect(captain.isOk() && player.isOk()).toBe(true);
    if (!captain.isOk() || !player.isOk()) return;
    const promoted = await changeRole.execute({
      actorId: asActorId("actor-1"),
      organizationId: orgId,
      competitionId: compId,
      teamId: team.value.id,
      rosterMembershipId: player.value.id,
      role: "captain",
    });
    expect(promoted.isOk()).toBe(true);
    if (!promoted.isOk()) return;
    const members = await rosters.listByTeam(orgId, compId, team.value.id);
    expect(members.find((m) => m.id === captain.value.id)?.role).toBe("player");
    expect(members.find((m) => m.id === player.value.id)?.role).toBe("captain");
  });

  it("demotes the previous captain when a captain joins the roster", async () => {
    const { teams, rosters, addToRoster } = rosterDeps();
    const orgId = asOrganizationId("org-1");
    const compId = asCompetitionId("comp-1");
    const team = await new CreateTeamUseCase({ teams, ...shared() }).execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "New Captain FC",
    });
    if (!team.isOk()) throw team.error;

    const results = [];
    for (const playerProfileId of ["profile-1", "profile-2"]) {
      results.push(
        await addToRoster.execute({
          organizationId: orgId,
          competitionId: compId,
          teamId: team.value.id,
          playerProfileId,
          role: "captain",
        }),
      );
    }

    expect(results.every((result) => result.isOk())).toBe(true);
    const finalRoster = await rosters.listByTeam(orgId, compId, team.value.id);
    expect(finalRoster.filter((member) => member.role === "captain")).toHaveLength(1);
    expect(finalRoster.find((member) => member.playerProfileId === "profile-1")?.role).toBe(
      "player",
    );
  });

  it("rejects roster writes when the competition entry is no longer live", async () => {
    const { teams, addToRoster, entryGate } = rosterDeps();
    entryGate.canMutateRoster = async () => false;
    const orgId = asOrganizationId("org-1");
    const team = await new CreateTeamUseCase({ teams, ...shared() }).execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Rejected FC",
    });
    if (!team.isOk()) throw team.error;

    const added = await addToRoster.execute({
      organizationId: orgId,
      competitionId: asCompetitionId("comp-1"),
      teamId: team.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });

    expect(added.isOk()).toBe(false);
    if (added.isOk()) return;
    expect(RosterEntryInactive.is(added.error)).toBe(true);
  });

  it("keeps exactly one captain when two promotions run concurrently", async () => {
    const { teams, rosters, addToRoster, changeRole } = rosterDeps();
    const orgId = asOrganizationId("org-1");
    const compId = asCompetitionId("comp-1");
    const team = await new CreateTeamUseCase({ teams, ...shared() }).execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Concurrent FC",
    });
    if (!team.isOk()) throw team.error;

    const memberships = await Promise.all(
      ["profile-1", "profile-2", "profile-3"].map((playerProfileId, index) =>
        addToRoster.execute({
          organizationId: orgId,
          competitionId: compId,
          teamId: team.value.id,
          playerProfileId,
          role: index === 0 ? "captain" : "player",
        }),
      ),
    );
    if (memberships.some((membership) => !membership.isOk())) {
      throw new Error("roster setup failed");
    }
    const players = memberships.slice(1).map((membership) => {
      if (!membership.isOk()) throw membership.error;
      return membership.value;
    });

    const results = await Promise.all(
      players.map((player) =>
        changeRole.execute({
          actorId: asActorId("actor-1"),
          organizationId: orgId,
          competitionId: compId,
          teamId: team.value.id,
          rosterMembershipId: player.id,
          role: "captain",
        }),
      ),
    );

    expect(results.every((result) => result.isOk())).toBe(true);
    const finalRoster = await rosters.listByTeam(orgId, compId, team.value.id);
    expect(finalRoster.filter((member) => member.role === "captain")).toHaveLength(1);
  });

  it("cannot mutate a roster membership through another Team scope", async () => {
    const { teams, addToRoster, changeRole } = rosterDeps();
    const orgId = asOrganizationId("org-1");
    const compId = asCompetitionId("comp-1");
    const createTeam = new CreateTeamUseCase({ teams, ...shared() });
    const createdA = await createTeam.execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Team A",
    });
    const createdB = await createTeam.execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Team B",
    });
    if (!createdA.isOk() || !createdB.isOk()) throw new Error("team setup failed");
    const membership = await addToRoster.execute({
      organizationId: orgId,
      competitionId: compId,
      teamId: createdA.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    if (!membership.isOk()) throw membership.error;

    const result = await changeRole.execute({
      actorId: asActorId("actor-1"),
      organizationId: orgId,
      competitionId: compId,
      teamId: createdB.value.id,
      rosterMembershipId: membership.value.id,
      role: "captain",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("teams.roster_membership_not_found");
  });

  it("connects and retrieves a team external club", async () => {
    const teams = new Teams();
    const connections = new Connections();
    const deps = shared();
    const orgId = asOrganizationId("org-1");
    const team = await new CreateTeamUseCase({ teams, ...deps }).execute({
      organizationId: orgId,
      actorId: asActorId("actor-1"),
      name: "Club FC",
    });
    expect(team.isOk()).toBe(true);
    if (!team.isOk()) return;
    const connect = new ConnectTeamExternalClubUseCase({
      teams,
      connections,
      authorization: allowAllAuthorization,
    });
    const connected = await connect.execute({
      actorId: asActorId("manager"),
      organizationId: orgId,
      teamId: team.value.id,
      providerKey: "ea-clubs",
      externalClubId: "club-123",
      externalClubName: "Club FC",
      gameEdition: "FC 26",
      platform: "playstation",
    });
    expect(connected.isOk()).toBe(true);
    if (!connected.isOk()) return;
    const found = await new GetTeamExternalClubUseCase(connections).execute({
      teamId: team.value.id,
    });
    expect(found?.externalClubId).toBe("club-123");
  });
});
