import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId } from "@futrob/shared-kernel";
import { INVITATION_STATUS } from "../../domain/entities/organization-invitation.ts";
import {
  InvitationExhausted,
  InvitationExpired,
  InvitationInvalid,
  InvitationNotFound,
  InvitationRevoked,
} from "../../domain/errors/invitation.errors.ts";
import { CreateInvitationUseCase } from "../create-invitation/create-invitation.use-case.ts";
import { CreateOrganizationUseCase } from "../create-organization/create-organization.use-case.ts";
import { createOrgTestHarness } from "../test-harness.ts";
import { InspectCompetitionInvitationUseCase } from "./inspect-competition-invitation.use-case.ts";

describe("InspectCompetitionInvitationUseCase", () => {
  it("returns sanitized competition context without mutating the invitation or memberships", async () => {
    const harness = createOrgTestHarness();
    const createOrganization = new CreateOrganizationUseCase(harness);
    const createInvitation = new CreateInvitationUseCase(harness);
    const inspectInvitation = new InspectCompetitionInvitationUseCase(harness);
    const organizer = harness.actor("organizer");
    const invitedActor = harness.actor("invited-player");

    const organization = await createOrganization.execute({
      name: "Liga Nocturna",
      actorId: organizer,
    });
    expect(organization.isOk()).toBe(true);
    if (!organization.isOk()) return;

    const invitation = await createInvitation.execute({
      organizationId: organization.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invitation.isOk()).toBe(true);
    if (!invitation.isOk()) return;

    const tokenHash = harness.tokens.hashToken(invitation.value.token);
    const before = await harness.invitations.findByTokenHash(tokenHash);
    const result = await inspectInvitation.execute({
      token: `  ${invitation.value.token}  `,
      actorId: invitedActor,
    });
    const after = await harness.invitations.findByTokenHash(tokenHash);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value).toEqual({
      organizationId: organization.value.organization.id,
      organizationName: "Liga Nocturna",
      competitionId: "competition-1",
      competitionRole: "player",
      expiresAt: invitation.value.expiresAt,
    });
    expect(after).toEqual(before);
    expect(await harness.memberships.findByActor(invitedActor)).toEqual([]);
  });

  it.each([
    [INVITATION_STATUS.revoked, InvitationRevoked, "organizations.invitation_revoked"],
    [INVITATION_STATUS.expired, InvitationExpired, "organizations.invitation_expired"],
  ] as const)(
    "rejects a %s invitation without changing its stored state",
    async (status, kind, code) => {
      const harness = createOrgTestHarness();
      const organizer = harness.actor("organizer");
      const organization = await new CreateOrganizationUseCase(harness).execute({
        name: "Liga",
        actorId: organizer,
      });
      expect(organization.isOk()).toBe(true);
      if (!organization.isOk()) return;
      const invitation = await new CreateInvitationUseCase(harness).execute({
        organizationId: organization.value.organization.id,
        competitionId: asCompetitionId("competition-1"),
        role: "player",
        invitedByActorId: organizer,
      });
      expect(invitation.isOk()).toBe(true);
      if (!invitation.isOk()) return;
      const tokenHash = harness.tokens.hashToken(invitation.value.token);
      const stored = await harness.invitations.findByTokenHash(tokenHash);
      expect(stored).not.toBeNull();
      if (!stored) return;
      await harness.invitations.update({ ...stored, status });

      const result = await new InspectCompetitionInvitationUseCase(harness).execute({
        token: invitation.value.token,
        actorId: harness.actor("player"),
      });

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(kind.is(result.error)).toBe(true);
        expect(result.error.code).toBe(code);
      }
      expect((await harness.invitations.findByTokenHash(tokenHash))?.status).toBe(status);
    },
  );

  it("rejects a pending invitation past its expiry without persisting a status change", async () => {
    const harness = createOrgTestHarness();
    const organizer = harness.actor("organizer");
    const organization = await new CreateOrganizationUseCase(harness).execute({
      name: "Liga",
      actorId: organizer,
    });
    expect(organization.isOk()).toBe(true);
    if (!organization.isOk()) return;
    const invitation = await new CreateInvitationUseCase(harness).execute({
      organizationId: organization.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invitation.isOk()).toBe(true);
    if (!invitation.isOk()) return;
    harness.clock.advanceMs(8 * 24 * 60 * 60 * 1_000);

    const result = await new InspectCompetitionInvitationUseCase(harness).execute({
      token: invitation.value.token,
      actorId: harness.actor("player"),
    });

    expect(result.isOk()).toBe(false);
    if (!result.isOk()) expect(InvitationExpired.is(result.error)).toBe(true);
    const stored = await harness.invitations.findByTokenHash(
      harness.tokens.hashToken(invitation.value.token),
    );
    expect(stored?.status).toBe(INVITATION_STATUS.pending);
  });

  it("rejects missing and organization-only invitations without revealing private details", async () => {
    const harness = createOrgTestHarness();
    const inspect = new InspectCompetitionInvitationUseCase(harness);
    const missing = await inspect.execute({
      token: "missing",
      actorId: harness.actor("player"),
    });
    expect(missing.isOk()).toBe(false);
    if (!missing.isOk()) expect(InvitationNotFound.is(missing.error)).toBe(true);

    const organizer = harness.actor("organizer");
    const organization = await new CreateOrganizationUseCase(harness).execute({
      name: "Liga",
      actorId: organizer,
    });
    expect(organization.isOk()).toBe(true);
    if (!organization.isOk()) return;
    const invitation = await new CreateInvitationUseCase(harness).execute({
      organizationId: organization.value.organization.id,
      role: "member",
      invitedByActorId: organizer,
    });
    expect(invitation.isOk()).toBe(true);
    if (!invitation.isOk()) return;

    const invalid = await inspect.execute({
      token: invitation.value.token,
      actorId: harness.actor("player"),
    });
    expect(invalid.isOk()).toBe(false);
    if (!invalid.isOk()) {
      expect(InvitationInvalid.is(invalid.error)).toBe(true);
      expect(invalid.error.code).toBe("organizations.invitation_invalid");
    }
  });

  it("rejects single-use invitations consumed by another actor", async () => {
    const harness = createOrgTestHarness();
    const organizer = harness.actor("organizer");
    const organization = await new CreateOrganizationUseCase(harness).execute({
      name: "Liga",
      actorId: organizer,
    });
    expect(organization.isOk()).toBe(true);
    if (!organization.isOk()) return;
    const invitation = await new CreateInvitationUseCase(harness).execute({
      organizationId: organization.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invitation.isOk()).toBe(true);
    if (!invitation.isOk()) return;
    const tokenHash = harness.tokens.hashToken(invitation.value.token);
    await harness.invitations.claimPending(tokenHash, harness.actor("winner"), harness.clock.now());

    const result = await new InspectCompetitionInvitationUseCase(harness).execute({
      token: invitation.value.token,
      actorId: harness.actor("loser"),
    });

    expect(result.isOk()).toBe(false);
    if (!result.isOk()) expect(InvitationInvalid.is(result.error)).toBe(true);
  });

  it("reports an exhausted multi invitation but remains valid for an actor who already redeemed it", async () => {
    const harness = createOrgTestHarness();
    const organizer = harness.actor("organizer");
    const organization = await new CreateOrganizationUseCase(harness).execute({
      name: "Liga",
      actorId: organizer,
    });
    expect(organization.isOk()).toBe(true);
    if (!organization.isOk()) return;
    const invitation = await new CreateInvitationUseCase(harness).execute({
      organizationId: organization.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
      redeemPolicy: "multi",
      maxRedemptions: 1,
    });
    expect(invitation.isOk()).toBe(true);
    if (!invitation.isOk()) return;
    const tokenHash = harness.tokens.hashToken(invitation.value.token);
    const firstActor = harness.actor("first");
    await harness.invitations.claimRedemption(tokenHash, firstActor, harness.clock.now());
    const inspect = new InspectCompetitionInvitationUseCase(harness);

    const exhausted = await inspect.execute({
      token: invitation.value.token,
      actorId: harness.actor("second"),
    });
    const replay = await inspect.execute({ token: invitation.value.token, actorId: firstActor });

    expect(exhausted.isOk()).toBe(false);
    if (!exhausted.isOk()) expect(InvitationExhausted.is(exhausted.error)).toBe(true);
    expect(replay.isOk()).toBe(true);
  });
});
