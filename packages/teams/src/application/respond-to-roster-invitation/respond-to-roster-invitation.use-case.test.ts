import { describe, expect, it } from "vite-plus/test";
import { unwrapErr } from "@futrob/test-support";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionRosterMembership } from "../../domain/entities/competition-roster-membership.ts";
import type { CompetitionRosterState } from "../../domain/entities/competition-roster-state.ts";
import type { PlayerGameAccount } from "../../domain/entities/player-game-account.ts";
import type { PlayerProfile } from "../../domain/entities/player-profile.ts";
import type { Team } from "../../domain/entities/team.ts";
import { ROSTER_INVITATION_STATUS } from "../../domain/entities/roster-invitation.ts";
import {
  RosterInvitationExpired,
  RosterInvitationForbidden,
  RosterInvitationInvalid,
  RosterInvitationNotFound,
  RosterInviteeNotFound,
} from "../../domain/errors/roster-invitation.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";
import type { RosterCapacityPort } from "../../domain/ports/roster-capacity.port.ts";
import type {
  RosterMutationPort,
  RosterMutationScope,
} from "../../domain/ports/roster-mutation.port.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { EnsurePlayerProfileUseCase } from "../ensure-player-profile/ensure-player-profile.use-case.ts";
import { createRosterInvitationTestHarness } from "../roster-invitation-test-harness.ts";
import { CreateRosterInvitationUseCase } from "../create-roster-invitation/create-roster-invitation.use-case.ts";
import { RespondToRosterInvitationUseCase } from "./respond-to-roster-invitation.use-case.ts";

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
  async findByNormalizedIdentifier(normalizedIdentifier: string) {
    return this.rows.filter((row) => row.normalizedIdentifier === normalizedIdentifier);
  }
  async saveIfAbsent(account: PlayerGameAccount) {
    this.rows.push(account);
    return account;
  }
  async setProviderExternalPlayerId() {
    return null;
  }
  async findByCorrelation() {
    return [];
  }
}

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

function buildHarness(options?: { maxSize?: number }) {
  const harness = createRosterInvitationTestHarness();
  const teams = new Teams();
  const rosters = new Rosters();
  const rosterStates = new RosterStates();
  const capacity = new Capacity(options?.maxSize ?? 11);
  const profiles = new Profiles();
  const accounts = new Accounts();
  const mutations = new SerialRosterMutations();
  const shared = { clock: harness.clock, ids: harness.ids };
  const authorization: import("@futrob/shared-kernel").AuthorizationPort = {
    decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
  const ensurePlayerProfile = new EnsurePlayerProfileUseCase({ profiles, ...shared });
  const createInvitation = new CreateRosterInvitationUseCase({
    teams,
    invitations: harness.invitations,
    profiles,
    accounts,
    tokens: harness.tokens,
    authorization,
    entryGate: { canMutateRoster: async () => true },
    ...shared,
  });
  const respond = new RespondToRosterInvitationUseCase({
    teams,
    rosters,
    rosterStates,
    capacity,
    entryGate: { canMutateRoster: async () => true },
    invitations: harness.invitations,
    accounts,
    ensurePlayerProfile,
    mutations,
    ...shared,
  });

  return {
    ...harness,
    teams,
    rosters,
    rosterStates,
    profiles,
    accounts,
    createInvitation,
    respond,
  };
}

type Harness = ReturnType<typeof buildHarness>;

function seedTeam(ctx: Harness) {
  const orgId = asOrganizationId("org-1");
  const teamId = asTeamId("team-1");
  ctx.teams.rows.push({
    id: teamId,
    organizationId: orgId,
    name: "Sirius FC",
    createdAt: ctx.clock.now(),
    createdByActorId: asActorId("captain-1"),
    creationKey: null,
  });
  return { orgId, teamId, competitionId: asCompetitionId("comp-1") };
}

function seedPlayerAccount(ctx: Harness, actor: string, identifier: string) {
  const actorId = asActorId(actor);
  const profile: PlayerProfile = {
    id: `profile-${actor}`,
    actorId,
    createdAt: ctx.clock.now(),
  };
  ctx.profiles.rows.push(profile);
  ctx.accounts.rows.push({
    id: `account-${actor}`,
    playerProfileId: profile.id,
    identifier,
    normalizedIdentifier: identifier.toLocaleLowerCase("en-US"),
    providerExternalPlayerId: null,
    platform: "playstation",
    gameEdition: "FC26",
    createdAt: ctx.clock.now(),
  });
  return actorId;
}

async function seedDirectedInvitation(ctx: Harness, options?: { expiresInMs?: number }) {
  const { orgId, teamId, competitionId } = seedTeam(ctx);
  const captain = seedPlayerAccount(ctx, "captain-1", "CapiAlex");
  const invitee = seedPlayerAccount(ctx, "player-1", "davos282");
  const created = await ctx.createInvitation.execute({
    organizationId: orgId,
    competitionId,
    teamId,
    invitedByActorId: captain,
    invitedByDisplayName: "Alex Rojas",
    inviteeIdentifier: "Davos282",
    message: "Nos gustaría contar contigo en el equipo",
    expiresInMs: options?.expiresInMs,
  });
  if (!created.isOk()) throw created.error;
  return {
    orgId,
    teamId,
    competitionId,
    captain,
    invitee,
    invitationId: created.value.invitationId,
  };
}

describe("CreateRosterInvitationUseCase directed invitations", () => {
  it("resolves the invitee by game identifier and snapshots the inviter identity", async () => {
    const ctx = buildHarness();
    const { invitationId, invitee } = await seedDirectedInvitation(ctx);

    const stored = await ctx.invitations.findById(invitationId);
    expect(stored?.inviteeActorId).toBe(invitee);
    expect(stored?.inviteeIdentifier).toBe("Davos282");
    expect(stored?.invitedByDisplayName).toBe("Alex Rojas");
    expect(stored?.invitedByGamertag).toBe("CapiAlex");
    expect(stored?.message).toBe("Nos gustaría contar contigo en el equipo");
    expect(stored?.redeemPolicy).toBe("single");
  });

  it("rejects an invitee identifier that matches no registered account", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = seedTeam(ctx);
    const captain = seedPlayerAccount(ctx, "captain-1", "CapiAlex");

    const created = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: captain,
      inviteeIdentifier: "ghost-player",
    });

    expect(RosterInviteeNotFound.is(unwrapErr(created))).toBe(true);
  });

  it("keeps link invitations undirected when no invitee is given", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = seedTeam(ctx);
    const captain = seedPlayerAccount(ctx, "captain-1", "CapiAlex");

    const created = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: captain,
    });

    expect(created.isOk()).toBe(true);
    if (!created.isOk()) return;
    const stored = await ctx.invitations.findById(created.value.invitationId);
    expect(stored?.inviteeActorId).toBeNull();
    expect(stored?.invitedByGamertag).toBe("CapiAlex");
  });
});

describe("RespondToRosterInvitationUseCase", () => {
  it("accepts a directed invitation and adds the invitee to the roster", async () => {
    const ctx = buildHarness();
    const { invitationId, invitee } = await seedDirectedInvitation(ctx);

    const result = await ctx.respond.execute({
      invitationId,
      actorId: invitee,
      action: "accept",
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.kind).toBe("accepted");
    expect(ctx.rosters.rows).toHaveLength(1);
    const stored = await ctx.invitations.findById(invitationId);
    expect(stored?.status).toBe(ROSTER_INVITATION_STATUS.accepted);
    expect(stored?.acceptedByActorId).toBe(invitee);
    expect(stored?.respondedAt).not.toBeNull();
  });

  it("declines a directed invitation without touching the roster and is idempotent", async () => {
    const ctx = buildHarness();
    const { invitationId, invitee } = await seedDirectedInvitation(ctx);

    const first = await ctx.respond.execute({
      invitationId,
      actorId: invitee,
      action: "decline",
    });
    const second = await ctx.respond.execute({
      invitationId,
      actorId: invitee,
      action: "decline",
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(ctx.rosters.rows).toHaveLength(0);
    const stored = await ctx.invitations.findById(invitationId);
    expect(stored?.status).toBe(ROSTER_INVITATION_STATUS.declined);
    expect(stored?.respondedAt).not.toBeNull();
  });

  it("forbids responding when the actor is not the directed invitee", async () => {
    const ctx = buildHarness();
    const { invitationId } = await seedDirectedInvitation(ctx);
    const stranger = seedPlayerAccount(ctx, "stranger-1", "otherguy");

    const result = await ctx.respond.execute({
      invitationId,
      actorId: stranger,
      action: "accept",
    });

    expect(RosterInvitationForbidden.is(unwrapErr(result))).toBe(true);
  });

  it("forbids responding by id to an undirected link invitation", async () => {
    const ctx = buildHarness();
    const { orgId, teamId, competitionId } = seedTeam(ctx);
    const captain = seedPlayerAccount(ctx, "captain-1", "CapiAlex");
    const created = await ctx.createInvitation.execute({
      organizationId: orgId,
      competitionId,
      teamId,
      invitedByActorId: captain,
    });
    if (!created.isOk()) throw created.error;

    const result = await ctx.respond.execute({
      invitationId: created.value.invitationId,
      actorId: seedPlayerAccount(ctx, "player-1", "davos282"),
      action: "accept",
    });

    expect(RosterInvitationForbidden.is(unwrapErr(result))).toBe(true);
  });

  it("rejects responses to an expired invitation", async () => {
    const ctx = buildHarness();
    const { invitationId, invitee } = await seedDirectedInvitation(ctx, { expiresInMs: 1_000 });
    ctx.clock.advanceMs(2_000);

    const result = await ctx.respond.execute({
      invitationId,
      actorId: invitee,
      action: "accept",
    });

    expect(RosterInvitationExpired.is(unwrapErr(result))).toBe(true);
  });

  it("is idempotent when the invitee accepts twice", async () => {
    const ctx = buildHarness();
    const { invitationId, invitee } = await seedDirectedInvitation(ctx);

    const first = await ctx.respond.execute({ invitationId, actorId: invitee, action: "accept" });
    const second = await ctx.respond.execute({ invitationId, actorId: invitee, action: "accept" });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(ctx.rosters.rows).toHaveLength(1);
  });

  it("rejects declining an invitation that was already accepted", async () => {
    const ctx = buildHarness();
    const { invitationId, invitee } = await seedDirectedInvitation(ctx);
    await ctx.respond.execute({ invitationId, actorId: invitee, action: "accept" });

    const result = await ctx.respond.execute({
      invitationId,
      actorId: invitee,
      action: "decline",
    });

    expect(RosterInvitationInvalid.is(unwrapErr(result))).toBe(true);
  });

  it("returns not found for an unknown invitation id", async () => {
    const ctx = buildHarness();
    const invitee = seedPlayerAccount(ctx, "player-1", "davos282");

    const result = await ctx.respond.execute({
      invitationId: "missing",
      actorId: invitee,
      action: "accept",
    });

    expect(RosterInvitationNotFound.is(unwrapErr(result))).toBe(true);
  });
});
