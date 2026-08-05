import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import {
  INVITATION_STATUS,
  REDEEM_POLICY,
  type OrganizationInvitation,
} from "@futrob/organizations";
import { InMemoryInvitationRepository } from "./in-memory.repository.ts";

function pendingInvite(overrides?: Partial<OrganizationInvitation>): OrganizationInvitation {
  return {
    id: "inv-1",
    organizationId: asOrganizationId("org-1"),
    competitionId: null,
    role: "player",
    tokenHash: "hash:token-1",
    email: null,
    status: INVITATION_STATUS.pending,
    invitedByActorId: asActorId("inviter"),
    expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    acceptedByActorId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    redeemPolicy: REDEEM_POLICY.single,
    maxRedemptions: null,
    redeemedCount: 0,
    ...overrides,
  };
}

describe("InMemoryInvitationRepository.claimPending", () => {
  it("claims a pending unexpired invitation once", async () => {
    const repo = new InMemoryInvitationRepository();
    const invite = pendingInvite();
    await repo.create(invite);
    const now = new Date("2026-06-01T00:00:00.000Z");
    const winner = asActorId("winner");
    const loser = asActorId("loser");

    const first = await repo.claimPending(invite.tokenHash, winner, now);
    const second = await repo.claimPending(invite.tokenHash, loser, now);

    expect(first).toMatchObject({
      status: INVITATION_STATUS.accepted,
      acceptedByActorId: winner,
    });
    expect(second).toBeNull();
    expect(await repo.findByTokenHash(invite.tokenHash)).toMatchObject({
      status: INVITATION_STATUS.accepted,
      acceptedByActorId: winner,
    });
  });

  it("returns null for expired pending invitations", async () => {
    const repo = new InMemoryInvitationRepository();
    const invite = pendingInvite({
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    await repo.create(invite);

    const claimed = await repo.claimPending(
      invite.tokenHash,
      asActorId("late"),
      new Date("2026-01-03T00:00:00.000Z"),
    );

    expect(claimed).toBeNull();
    expect(await repo.findByTokenHash(invite.tokenHash)).toMatchObject({
      status: INVITATION_STATUS.pending,
    });
  });
});

describe("InMemoryInvitationRepository.claimRedemption", () => {
  function multiInvite(overrides?: Partial<OrganizationInvitation>): OrganizationInvitation {
    return pendingInvite({
      redeemPolicy: REDEEM_POLICY.multi,
      maxRedemptions: 2,
      redeemedCount: 0,
      ...overrides,
    });
  }

  it("lets up to maxRedemptions distinct actors claim, then reports exhausted", async () => {
    const repo = new InMemoryInvitationRepository();
    const invite = multiInvite();
    await repo.create(invite);
    const now = new Date("2026-06-01T00:00:00.000Z");

    const first = await repo.claimRedemption(invite.tokenHash, asActorId("actor-a"), now);
    const second = await repo.claimRedemption(invite.tokenHash, asActorId("actor-b"), now);
    const third = await repo.claimRedemption(invite.tokenHash, asActorId("actor-c"), now);

    expect(first).toMatchObject({ outcome: "claimed" });
    expect(second).toMatchObject({ outcome: "claimed" });
    expect(third).toBeNull();
    expect(await repo.findByTokenHash(invite.tokenHash)).toMatchObject({
      status: INVITATION_STATUS.pending,
      redeemedCount: 2,
    });
  });

  it("is idempotent when the same actor claims twice without consuming an extra cupo slot", async () => {
    const repo = new InMemoryInvitationRepository();
    const invite = multiInvite({ maxRedemptions: 1 });
    await repo.create(invite);
    const now = new Date("2026-06-01T00:00:00.000Z");
    const actor = asActorId("actor-a");

    const first = await repo.claimRedemption(invite.tokenHash, actor, now);
    const second = await repo.claimRedemption(invite.tokenHash, actor, now);

    expect(first).toMatchObject({ outcome: "claimed" });
    expect(second).toMatchObject({ outcome: "already-redeemed" });
    expect(await repo.findByTokenHash(invite.tokenHash)).toMatchObject({ redeemedCount: 1 });
  });

  it("returns null for single-policy invitations", async () => {
    const repo = new InMemoryInvitationRepository();
    const invite = pendingInvite();
    await repo.create(invite);

    const claimed = await repo.claimRedemption(
      invite.tokenHash,
      asActorId("actor-a"),
      new Date("2026-06-01T00:00:00.000Z"),
    );

    expect(claimed).toBeNull();
  });

  it("returns null for expired multi invitations", async () => {
    const repo = new InMemoryInvitationRepository();
    const invite = multiInvite({ expiresAt: new Date("2026-01-02T00:00:00.000Z") });
    await repo.create(invite);

    const claimed = await repo.claimRedemption(
      invite.tokenHash,
      asActorId("actor-a"),
      new Date("2026-01-03T00:00:00.000Z"),
    );

    expect(claimed).toBeNull();
  });
});
