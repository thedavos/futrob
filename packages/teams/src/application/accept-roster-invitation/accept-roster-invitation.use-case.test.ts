import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionRosterMembership } from "../../domain/entities/competition-roster-membership.ts";
import type { CompetitionRosterState } from "../../domain/entities/competition-roster-state.ts";
import type { PlayerProfile } from "../../domain/entities/player-profile.ts";
import type { Team } from "../../domain/entities/team.ts";
import { ROSTER_INVITATION_STATUS } from "../../domain/entities/roster-invitation.ts";
import {
  RosterInvitationExpired,
  RosterInvitationInvalid,
  RosterInvitationRevoked,
} from "../../domain/errors/roster-invitation.errors.ts";
import { RosterFull, RosterLocked } from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";
import type { RosterCapacityPort } from "../../domain/ports/roster-capacity.port.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { AddToRosterUseCase } from "../add-to-roster/add-to-roster.use-case.ts";
import { EnsurePlayerProfileUseCase } from "../ensure-player-profile/ensure-player-profile.use-case.ts";
import { createRosterInvitationTestHarness } from "../roster-invitation-test-harness.ts";
import { AcceptRosterInvitationUseCase } from "./accept-roster-invitation.use-case.ts";
import { CreateRosterInvitationUseCase } from "../create-roster-invitation/create-roster-invitation.use-case.ts";

class Teams implements TeamRepository {
  rows: Team[] = [];
  async findById(organizationId: Team["organizationId"], teamId: Team["id"]) {
    return (
      this.rows.find((row) => row.id === teamId && row.organizationId === organizationId) ?? null
    );
  }
  async findByCreationKey() {
    return null;
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
  async listByPlayerProfile() {
    return [];
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

function buildHarness(options?: { maxSize?: number }) {
  const harness = createRosterInvitationTestHarness();
  const teams = new Teams();
  const rosters = new Rosters();
  const rosterStates = new RosterStates();
  const capacity = new Capacity(options?.maxSize ?? 11);
  const profiles = new Profiles();
  const shared = { clock: harness.clock, ids: harness.ids };
  const ensurePlayerProfile = new EnsurePlayerProfileUseCase({ profiles, ...shared });
  const addToRoster = new AddToRosterUseCase({
    teams,
    rosters,
    rosterStates,
    capacity,
    accounts: {
      listByProfile: async () => [],
      saveIfAbsent: async (account) => account,
    },
    ...shared,
  });
  const createInvitation = new CreateRosterInvitationUseCase({
    teams,
    invitations: harness.invitations,
    tokens: harness.tokens,
    ...shared,
  });
  const acceptInvitation = new AcceptRosterInvitationUseCase({
    teams,
    rosters,
    rosterStates,
    capacity,
    profiles,
    invitations: harness.invitations,
    tokens: harness.tokens,
    ensurePlayerProfile,
    addToRoster,
    clock: harness.clock,
  });

  return {
    ...harness,
    teams,
    rosters,
    rosterStates,
    profiles,
    createInvitation,
    acceptInvitation,
  };
}

function wireMultiSlotGuard(ctx: ReturnType<typeof buildHarness>) {
  ctx.invitations.rosterMemberCount = (invitation) =>
    ctx.rosters.rows.filter(
      (row) =>
        row.organizationId === invitation.organizationId &&
        row.competitionId === invitation.competitionId &&
        row.teamId === invitation.teamId,
    ).length;
}

describe("AcceptRosterInvitationUseCase", () => {
  async function seedTeam(ctx: ReturnType<typeof buildHarness>) {
    const orgId = asOrganizationId("org-1");
    const teamId = asTeamId("team-1");
    ctx.teams.rows.push({
      id: teamId,
      organizationId: orgId,
      name: "FC Alpha",
      createdAt: ctx.clock.now(),
      createdByActorId: asActorId("staff-1"),
      creationKey: null,
    });
    return { orgId, teamId, competitionId: asCompetitionId("comp-1") };
  }

  it("accepts an invitation and is idempotent on double accept", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = await seedTeam(ctx);
    const staff = ctx.actor("staff-1");
    const player = ctx.actor("player-1");

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: staff,
      role: "player",
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const first = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: player,
    });
    const second = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: player,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;
    expect(second.value).toEqual(first.value);
    expect(ctx.rosters.rows).toHaveLength(1);
  });

  it("rejects expired invitations", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = await seedTeam(ctx);

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
      expiresInMs: 1_000,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    ctx.clock.advanceMs(2_000);
    const result = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: ctx.actor("late"),
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(RosterInvitationExpired.is(result.error)).toBe(true);
  });

  it("rejects revoked invitations", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = await seedTeam(ctx);

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const stored = await ctx.invitations.findByTokenHash(ctx.tokens.hashToken(invite.value.token));
    expect(stored).not.toBeNull();
    if (!stored) return;
    await ctx.invitations.create({ ...stored, status: ROSTER_INVITATION_STATUS.revoked });

    const result = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: ctx.actor("revoked-user"),
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(RosterInvitationRevoked.is(result.error)).toBe(true);
  });

  it("rejects a second distinct actor after the invitation was accepted", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = await seedTeam(ctx);
    const winner = ctx.actor("winner");
    const loser = ctx.actor("loser");

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const first = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: winner,
    });
    const second = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: loser,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(false);
    if (!second.isOk()) {
      expect(RosterInvitationInvalid.is(second.error)).toBe(true);
    }
    expect(ctx.rosters.rows).toHaveLength(1);
  });

  it("only one of two concurrent distinct actors wins the claim", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = await seedTeam(ctx);
    const actorA = ctx.actor("actor-a");
    const actorB = ctx.actor("actor-b");

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    let entered = 0;
    let releaseFirst: (() => void) | undefined;
    const firstAtClaim = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    ctx.invitations.beforeClaim = async () => {
      entered += 1;
      if (entered === 1) {
        await firstAtClaim;
      } else {
        releaseFirst?.();
      }
    };

    const [resultA, resultB] = await Promise.all([
      ctx.acceptInvitation.execute({ token: invite.value.token, actorId: actorA }),
      ctx.acceptInvitation.execute({ token: invite.value.token, actorId: actorB }),
    ]);

    const winners = [resultA, resultB].filter((r) => r.isOk());
    const losers = [resultA, resultB].filter((r) => !r.isOk());
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    if (!losers[0]!.isOk()) {
      expect(RosterInvitationInvalid.is(losers[0]!.error)).toBe(true);
    }
    expect(ctx.rosters.rows).toHaveLength(1);
  });

  it("rejects acceptance when roster is locked before claim", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = await seedTeam(ctx);
    await ctx.rosterStates.save({
      organizationId: orgId,
      competitionId,
      teamId,
      lockedAt: ctx.clock.now(),
    });

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const result = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: ctx.actor("player-1"),
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(RosterLocked.is(result.error)).toBe(true);
  });

  it("rejects acceptance when roster is full before claim", async () => {
    const ctx = buildHarness({ maxSize: 1 });
    const { orgId, teamId, competitionId } = await seedTeam(ctx);
    ctx.rosters.rows.push({
      id: "membership-1",
      organizationId: orgId,
      competitionId,
      teamId,
      playerProfileId: "profile-existing",
      gameAccountId: null,
      role: "player",
      createdAt: ctx.clock.now(),
    });

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const result = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: ctx.actor("player-1"),
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(RosterFull.is(result.error)).toBe(true);
  });
});

describe("AcceptRosterInvitationUseCase multi policy", () => {
  async function seedTeam(ctx: ReturnType<typeof buildHarness>) {
    const orgId = asOrganizationId("org-1");
    const teamId = asTeamId("team-1");
    ctx.teams.rows.push({
      id: teamId,
      organizationId: orgId,
      name: "FC Alpha",
      createdAt: ctx.clock.now(),
      createdByActorId: asActorId("staff-1"),
      creationKey: null,
    });
    wireMultiSlotGuard(ctx);
    return { orgId, teamId, competitionId: asCompetitionId("comp-1") };
  }

  it("accepts multiple actors until the roster is full", async () => {
    const ctx = buildHarness({ maxSize: 2 });
    const { orgId, teamId, competitionId } = await seedTeam(ctx);

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
      redeemPolicy: "multi",
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const first = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: ctx.actor("player-1"),
    });
    const second = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: ctx.actor("player-2"),
    });
    const third = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: ctx.actor("player-3"),
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(third.isOk()).toBe(false);
    if (third.isOk()) return;
    expect(RosterFull.is(third.error)).toBe(true);
    expect(ctx.rosters.rows).toHaveLength(2);

    const stored = await ctx.invitations.findByTokenHash(ctx.tokens.hashToken(invite.value.token));
    expect(stored?.status).toBe(ROSTER_INVITATION_STATUS.pending);
    expect(stored?.redeemPolicy).toBe("multi");
  });

  it("is idempotent for the same actor on multi invitations", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = await seedTeam(ctx);

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
      redeemPolicy: "multi",
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const player = ctx.actor("player-1");
    const first = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: player,
    });
    const second = await ctx.acceptInvitation.execute({
      token: invite.value.token,
      actorId: player,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;
    expect(second.value).toEqual(first.value);
    expect(ctx.rosters.rows).toHaveLength(1);
  });

  it("only one actor wins the last roster slot under concurrency", async () => {
    const ctx = buildHarness({ maxSize: 1 });
    const { orgId, teamId, competitionId } = await seedTeam(ctx);
    const actorA = ctx.actor("actor-a");
    const actorB = ctx.actor("actor-b");

    const invite = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: ctx.actor("staff-1"),
      redeemPolicy: "multi",
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    let entered = 0;
    let releaseFirst: (() => void) | undefined;
    const firstAtClaim = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    ctx.invitations.beforeClaim = async () => {
      entered += 1;
      if (entered === 1) {
        await firstAtClaim;
      } else {
        releaseFirst?.();
      }
    };

    const [resultA, resultB] = await Promise.all([
      ctx.acceptInvitation.execute({ token: invite.value.token, actorId: actorA }),
      ctx.acceptInvitation.execute({ token: invite.value.token, actorId: actorB }),
    ]);

    const winners = [resultA, resultB].filter((r) => r.isOk());
    const losers = [resultA, resultB].filter((r) => !r.isOk());
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    if (!losers[0]!.isOk()) {
      expect(RosterFull.is(losers[0]!.error)).toBe(true);
    }
    expect(ctx.rosters.rows).toHaveLength(1);
  });
});

describe("CreateRosterInvitationUseCase", () => {
  it("creates a pending invitation with a plain token", async () => {
    const ctx = buildHarness();
    const orgId = asOrganizationId("org-1");
    const teamId = asTeamId("team-1");
    ctx.teams.rows.push({
      id: teamId,
      organizationId: orgId,
      name: "FC Alpha",
      createdAt: ctx.clock.now(),
      createdByActorId: asActorId("staff-1"),
      creationKey: null,
    });

    const result = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId: asCompetitionId("comp-1"),
      teamId,
      invitedByActorId: asActorId("staff-1"),
      role: "captain",
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.token).toMatch(/^plain-token-/);
    expect(result.value.role).toBe("captain");
    expect(result.value.status).toBe(ROSTER_INVITATION_STATUS.pending);

    const stored = await ctx.invitations.findByTokenHash(ctx.tokens.hashToken(result.value.token));
    expect(stored?.tokenHash).toBe(ctx.tokens.hashToken(result.value.token));
    expect(stored?.redeemPolicy).toBe("single");
  });

  it("persists multi redeem policy when requested", async () => {
    const ctx = buildHarness();
    const orgId = asOrganizationId("org-1");
    const teamId = asTeamId("team-1");
    ctx.teams.rows.push({
      id: teamId,
      organizationId: orgId,
      name: "FC Alpha",
      createdAt: ctx.clock.now(),
      createdByActorId: asActorId("staff-1"),
      creationKey: null,
    });

    const result = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId: asCompetitionId("comp-1"),
      teamId,
      invitedByActorId: asActorId("staff-1"),
      redeemPolicy: "multi",
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const stored = await ctx.invitations.findByTokenHash(ctx.tokens.hashToken(result.value.token));
    expect(stored?.redeemPolicy).toBe("multi");
  });
});
