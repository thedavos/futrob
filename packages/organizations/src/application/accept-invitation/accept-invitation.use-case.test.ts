import { describe, expect, it } from "vite-plus/test";
import { AcceptInvitationUseCase } from "./accept-invitation.use-case.ts";
import { CreateInvitationUseCase } from "../create-invitation/create-invitation.use-case.ts";
import { CreateOrganizationUseCase } from "../create-organization/create-organization.use-case.ts";
import { createOrgTestHarness } from "../test-harness.ts";

describe("AcceptInvitationUseCase", () => {
  it("accepts an invitation with the invite role and is idempotent on double accept", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const captain = harness.actor("captain-1");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.ok).toBe(true);
    if (!org.ok) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "captain",
      invitedByActorId: organizer,
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) {
      return;
    }

    const first = await acceptInvite.execute({ token: invite.value.token, actorId: captain });
    const second = await acceptInvite.execute({ token: invite.value.token, actorId: captain });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(first.value.role).toBe("captain");
    expect(second.value).toEqual(first.value);
    expect(await harness.memberships.findByActor(captain)).toHaveLength(1);
  });

  it("rejects expired invitations", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.ok).toBe(true);
    if (!org.ok) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "staff",
      invitedByActorId: organizer,
      expiresInMs: 1_000,
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) {
      return;
    }

    harness.clock.advanceMs(2_000);

    const result = await acceptInvite.execute({
      token: invite.value.token,
      actorId: harness.actor("late"),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("organizations.invitation_expired");
  });

  it("rejects revoked invitations", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.ok).toBe(true);
    if (!org.ok) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "staff",
      invitedByActorId: organizer,
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) {
      return;
    }

    const stored = await harness.invitations.findByTokenHash(
      harness.tokens.hashToken(invite.value.token),
    );
    expect(stored).not.toBeNull();
    if (!stored) {
      return;
    }
    await harness.invitations.update({ ...stored, status: "revoked" });

    const result = await acceptInvite.execute({
      token: invite.value.token,
      actorId: harness.actor("revoked-user"),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("organizations.invitation_revoked");
  });
});
