import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { ROSTER_INVITATION_STATUS, type RosterInvitation } from "@futrob/teams";
import { InMemoryRosterInvitationRepository } from "./roster-invitation.repository.ts";

function pendingInvite(overrides?: Partial<RosterInvitation>): RosterInvitation {
  return {
    id: "inv-1",
    organizationId: asOrganizationId("org-1"),
    competitionId: asCompetitionId("comp-1"),
    teamId: asTeamId("team-1"),
    role: "player",
    tokenHash: "hash:token-1",
    status: ROSTER_INVITATION_STATUS.pending,
    invitedByActorId: asActorId("inviter"),
    expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    acceptedByActorId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    redeemPolicy: "single",
    ...overrides,
  };
}

const claimOptions = { hasFreeSlot: true, maxRosterSize: 11 };

describe("InMemoryRosterInvitationRepository.claimPending", () => {
  it("claims a pending unexpired invitation once", async () => {
    const repo = new InMemoryRosterInvitationRepository();
    const invite = pendingInvite();
    await repo.create(invite);
    const now = new Date("2026-06-01T00:00:00.000Z");
    const winner = asActorId("winner");
    const loser = asActorId("loser");

    const first = await repo.claimPending(invite.tokenHash, winner, now, claimOptions);
    const second = await repo.claimPending(invite.tokenHash, loser, now, claimOptions);

    expect(first).toMatchObject({
      status: ROSTER_INVITATION_STATUS.accepted,
      acceptedByActorId: winner,
    });
    expect(second).toBeNull();
    expect(await repo.findByTokenHash(invite.tokenHash)).toMatchObject({
      status: ROSTER_INVITATION_STATUS.accepted,
      acceptedByActorId: winner,
    });
  });

  it("returns null for expired pending invitations", async () => {
    const repo = new InMemoryRosterInvitationRepository();
    const invite = pendingInvite({
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    await repo.create(invite);

    const claimed = await repo.claimPending(
      invite.tokenHash,
      asActorId("late"),
      new Date("2026-01-03T00:00:00.000Z"),
      claimOptions,
    );

    expect(claimed).toBeNull();
    expect(await repo.findByTokenHash(invite.tokenHash)).toMatchObject({
      status: ROSTER_INVITATION_STATUS.pending,
    });
  });

  it("records multi redemptions while keeping the invitation pending", async () => {
    const repo = new InMemoryRosterInvitationRepository();
    const invite = pendingInvite({ redeemPolicy: "multi" });
    await repo.create(invite);
    const now = new Date("2026-06-01T00:00:00.000Z");
    const firstActor = asActorId("player-a");
    const secondActor = asActorId("player-b");

    const first = await repo.claimPending(invite.tokenHash, firstActor, now, claimOptions);
    const second = await repo.claimPending(invite.tokenHash, secondActor, now, claimOptions);
    const firstAgain = await repo.claimPending(invite.tokenHash, firstActor, now, claimOptions);

    expect(first?.status).toBe(ROSTER_INVITATION_STATUS.pending);
    expect(second?.status).toBe(ROSTER_INVITATION_STATUS.pending);
    expect(firstAgain?.status).toBe(ROSTER_INVITATION_STATUS.pending);
    expect(await repo.findRedemption(invite.id, firstActor)).toEqual(now);
    expect(await repo.findRedemption(invite.id, secondActor)).toEqual(now);
  });

  it("rejects multi redemption when roster capacity is exhausted", async () => {
    const repo = new InMemoryRosterInvitationRepository();
    const invite = pendingInvite({ redeemPolicy: "multi" });
    repo.rosterMemberCount = () => 1;
    await repo.create(invite);
    const now = new Date("2026-06-01T00:00:00.000Z");

    const claimed = await repo.claimPending(invite.tokenHash, asActorId("late"), now, {
      hasFreeSlot: true,
      maxRosterSize: 1,
    });

    expect(claimed).toBeNull();
    expect(await repo.findByTokenHash(invite.tokenHash)).toMatchObject({
      status: ROSTER_INVITATION_STATUS.pending,
    });
  });
});
