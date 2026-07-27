import { describe, expect, it } from "vite-plus/test";
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
    expect(org.ok).toBe(true);
    if (!org.ok) {
      return;
    }

    const result = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "organizer",
      invitedByActorId: organizer,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("organizations.invalid_role");
  });

  it("forbids invitations from actors who are not organizer or staff", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const player = harness.actor("player-1");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.ok).toBe(true);
    if (!org.ok) {
      return;
    }

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invite.ok).toBe(true);
    if (!invite.ok) {
      return;
    }

    const accepted = await acceptInvite.execute({ token: invite.value.token, actorId: player });
    expect(accepted.ok).toBe(true);

    const forbidden = await createInvite.execute({
      organizationId: org.value.organization.id,
      role: "captain",
      invitedByActorId: player,
    });

    expect(forbidden.ok).toBe(false);
    if (forbidden.ok) {
      return;
    }
    expect(forbidden.error.code).toBe("organizations.forbidden");
  });
});
