import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { ActiveTeamPreference } from "../domain/entities/active-team-preference.ts";
import type { CompetitionRosterMembership } from "../domain/entities/competition-roster-membership.ts";
import type { PlayerGameAccount } from "../domain/entities/player-game-account.ts";
import type { PlayerProfile } from "../domain/entities/player-profile.ts";
import type { Team } from "../domain/entities/team.ts";
import type { ActiveTeamPreferenceRepository } from "../domain/ports/active-team-preference.repository.ts";
import type { CompetitionRosterMembershipRepository } from "../domain/ports/competition-roster-membership.repository.ts";
import type { PlayerGameAccountRepository } from "../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../domain/ports/player-profile.repository.ts";
import type { TeamRepository } from "../domain/ports/team.repository.ts";
import { AddToRosterUseCase } from "./add-to-roster/add-to-roster.use-case.ts";
import { CreateTeamUseCase } from "./create-team/create-team.use-case.ts";
import { GetActiveTeamUseCase } from "./get-active-team/get-active-team.use-case.ts";
import { ListRostersForPlayerUseCase } from "./list-rosters-for-player/list-rosters-for-player.use-case.ts";
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
    this.rows.push(membership);
    return membership;
  }
}

class Profiles implements PlayerProfileRepository {
  rows: PlayerProfile[] = [];
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
  async listByProfile(playerProfileId: string) {
    return this.rows.filter((row) => row.playerProfileId === playerProfileId);
  }
  async saveIfAbsent(account: PlayerGameAccount) {
    this.rows.push(account);
    return account;
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

function shared() {
  let sequence = 0;
  return {
    clock: { now: () => new Date("2026-08-01T12:00:00.000Z") },
    ids: { generate: () => `id-${++sequence}` },
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
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.id).toBe(first.value.id);
    expect(teams.rows).toHaveLength(1);
  });

  it("allows the same player on teams in different competitions and rejects a second team in one competition", async () => {
    const teams = new Teams();
    const rosters = new Rosters();
    const accounts = new Accounts();
    const createTeam = new CreateTeamUseCase({ teams, ...shared() });
    const addToRoster = new AddToRosterUseCase({ teams, rosters, accounts, ...shared() });
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
    expect(teamA.ok && teamB.ok && teamC.ok).toBe(true);
    if (!teamA.ok || !teamB.ok || !teamC.ok) return;

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

    expect(first.ok && across.ok).toBe(true);
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe("teams.roster_competition_conflict");
    expect(retry.ok && first.ok && retry.value.id).toBe(first.ok ? first.value.id : "");
    expect(
      await new ListRostersForPlayerUseCase(rosters).execute({ playerProfileId: "profile-1" }),
    ).toHaveLength(2);
  });

  it("sets active team only for a membership owned by the actor", async () => {
    const teams = new Teams();
    const rosters = new Rosters();
    const profiles = new Profiles();
    const accounts = new Accounts();
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
    expect(team.ok).toBe(true);
    if (!team.ok) return;
    const membership = await new AddToRosterUseCase({
      teams,
      rosters,
      accounts,
      ...deps,
    }).execute({
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("comp-1"),
      teamId: team.value.id,
      playerProfileId: "profile-1",
      role: "player",
    });
    expect(membership.ok).toBe(true);
    if (!membership.ok) return;

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
    expect(saved.ok).toBe(true);
    expect(foreign.ok).toBe(false);
    expect(
      await new GetActiveTeamUseCase(preferences).execute({ actorId: asActorId("actor-1") }),
    ).toMatchObject({ rosterMembershipId: membership.value.id });
  });

  it("rejects a game account that does not belong to the player profile", async () => {
    const teams = new Teams();
    const rosters = new Rosters();
    const accounts = new Accounts();
    const deps = shared();
    const team = await new CreateTeamUseCase({ teams, ...deps }).execute({
      organizationId: asOrganizationId("org-1"),
      actorId: asActorId("actor-1"),
      name: "Bound FC",
    });
    expect(team.ok).toBe(true);
    if (!team.ok) return;
    const result = await new AddToRosterUseCase({ teams, rosters, accounts, ...deps }).execute({
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("comp-1"),
      teamId: team.value.id,
      playerProfileId: "profile-1",
      gameAccountId: "account-x",
      role: "player",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("teams.game_account_not_found");
    // silence unused branded helper in case of future assertions
    expect(asTeamId(team.value.id)).toBe(team.value.id);
  });
});
