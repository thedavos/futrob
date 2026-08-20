import { describe, expect, it } from "vite-plus/test";
import { unwrapErr } from "@futrob/test-support";
import { asCompetitionId } from "@futrob/shared-kernel";
import { REDEEM_POLICY } from "../../domain/entities/organization-invitation.ts";
import {
  InvalidInvitationRedeemPolicy,
  InvalidInvitationRole,
  OrganizationForbidden,
} from "../../domain/errors/invitation.errors.ts";
import { AcceptInvitationUseCase } from "../accept-invitation/accept-invitation.use-case.ts";
import { CreateInvitationUseCase } from "./create-invitation.use-case.ts";
import { CreateOrganizationUseCase } from "../create-organization/create-organization.use-case.ts";
import { createOrgTestHarness } from "../test-harness.ts";

describe("CreateInvitationUseCase", () => {
  it("rejects organizer as an invitation role", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) {
      return;
    }

    const result = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "organizer",
      invitedByActorId: organizer,
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) {
      return;
    }
    expect(InvalidInvitationRole.is(result.error)).toBe(true);
    expect(result.error.code).toBe("organizations.invalid_role");
  });

  it("requires competition scope for player and captain invitations", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    for (const role of ["player", "captain"] as const) {
      const result = await createInvite.execute({
        organizationId: org.value.organization.id,
        role,
        invitedByActorId: organizer,
      });
      expect(result.isOk()).toBe(false);
      const roleError = unwrapErr(result);
      expect(InvalidInvitationRole.is(roleError)).toBe(true);
      expect(roleError.code).toBe("organizations.invalid_role");
    }
  });

  it("forbids invitations from actors who are not organizer or staff", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const player = harness.actor("player-1");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) {
      return;
    }

    const accepted = await acceptInvite.execute({ token: invite.value.token, actorId: player });
    expect(accepted.isOk()).toBe(true);

    const forbidden = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "captain",
      invitedByActorId: player,
    });

    expect(forbidden.isOk()).toBe(false);
    if (forbidden.isOk()) {
      return;
    }
    expect(OrganizationForbidden.is(forbidden.error)).toBe(true);
    expect(forbidden.error.code).toBe("organizations.forbidden");
  });

  it("defaults create to redeemPolicy single with no maxRedemptions", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const result = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "staff",
      invitedByActorId: organizer,
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.redeemPolicy).toBe(REDEEM_POLICY.single);
    expect(result.value.maxRedemptions).toBeNull();
  });

  it("creates a multi invitation with a positive maxRedemptions", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const result = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
      redeemPolicy: "multi",
      maxRedemptions: 5,
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.redeemPolicy).toBe(REDEEM_POLICY.multi);
    expect(result.value.maxRedemptions).toBe(5);
  });

  it("rejects multi without a positive maxRedemptions", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    for (const maxRedemptions of [undefined, 0, -1, 1.5] as const) {
      const result = await createInvite.execute({
        organizationId: org.value.organization.id,
        role: "staff",
        invitedByActorId: organizer,
        redeemPolicy: "multi",
        maxRedemptions,
      });
      expect(result.isOk()).toBe(false);
      const policyError = unwrapErr(result);
      expect(InvalidInvitationRedeemPolicy.is(policyError)).toBe(true);
      expect(policyError.code).toBe("organizations.invalid_redeem_policy");
    }
  });

  it("rejects maxRedemptions without redeemPolicy multi", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const result = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "staff",
      invitedByActorId: organizer,
      maxRedemptions: 3,
    });

    const policyError = unwrapErr(result);
    expect(InvalidInvitationRedeemPolicy.is(policyError)).toBe(true);
    expect(policyError.code).toBe("organizations.invalid_redeem_policy");
  });
});
