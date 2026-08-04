import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { INVITATION_STATUS, type OrganizationInvitation } from "@futrob/organizations";
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
