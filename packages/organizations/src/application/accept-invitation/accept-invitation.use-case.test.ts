import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId } from "@futrob/shared-kernel";
import {
  InvitationExpired,
  InvitationInvalid,
  InvitationRevoked,
} from "../../domain/errors/invitation.errors.ts";
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
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "captain",
      invitedByActorId: organizer,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) {
      return;
    }

    const first = await acceptInvite.execute({ token: invite.value.token, actorId: captain });
    const second = await acceptInvite.execute({ token: invite.value.token, actorId: captain });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) {
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
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "staff",
      invitedByActorId: organizer,
      expiresInMs: 1_000,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) {
      return;
    }

    harness.clock.advanceMs(2_000);

    const result = await acceptInvite.execute({
      token: invite.value.token,
      actorId: harness.actor("late"),
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) {
      return;
    }
    expect(InvitationExpired.is(result.error)).toBe(true);
    expect(result.error.code).toBe("organizations.invitation_expired");
  });

  it("rejects revoked invitations", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "staff",
      invitedByActorId: organizer,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) {
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

    expect(result.isOk()).toBe(false);
    if (result.isOk()) {
      return;
    }
    expect(InvitationRevoked.is(result.error)).toBe(true);
    expect(result.error.code).toBe("organizations.invitation_revoked");
  });

  it("requires a competition-scoped invitation when requested by onboarding", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const player = harness.actor("player-1");
    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const organizationInvite = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "staff",
      invitedByActorId: organizer,
    });
    expect(organizationInvite.isOk()).toBe(true);
    if (!organizationInvite.isOk()) return;

    const rejected = await acceptInvite.execute({
      token: organizationInvite.value.token,
      actorId: player,
      requireCompetition: true,
    });
    expect(rejected.isOk()).toBe(false);
    if (!rejected.isOk()) {
      expect(InvitationInvalid.is(rejected.error)).toBe(true);
      expect(rejected.error.code).toBe("organizations.invitation_invalid");
    }
    expect(await harness.memberships.findByActor(player)).toHaveLength(0);

    const competitionInvite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(competitionInvite.isOk()).toBe(true);
    if (!competitionInvite.isOk()) return;

    const accepted = await acceptInvite.execute({
      token: competitionInvite.value.token,
      actorId: player,
      requireCompetition: true,
    });
    expect(accepted.isOk()).toBe(true);
    if (!accepted.isOk()) return;
    expect(accepted.value).toMatchObject({
      competitionId: "competition-1",
      competitionRole: "player",
    });
  });
});
