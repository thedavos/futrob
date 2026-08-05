import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId } from "@futrob/shared-kernel";
import { INVITATION_STATUS } from "../../domain/entities/organization-invitation.ts";
import {
  InvitationExhausted,
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
    await harness.invitations.update({ ...stored, status: INVITATION_STATUS.revoked });

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

  it("rejects a second distinct actor after the invitation was accepted", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const winner = harness.actor("winner");
    const loser = harness.actor("loser");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const first = await acceptInvite.execute({ token: invite.value.token, actorId: winner });
    const second = await acceptInvite.execute({ token: invite.value.token, actorId: loser });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(false);
    if (!second.isOk()) {
      expect(InvitationInvalid.is(second.error)).toBe(true);
      expect(second.error.code).toBe("organizations.invitation_invalid");
    }
    expect(await harness.memberships.findByActor(winner)).toHaveLength(1);
    expect(await harness.memberships.findByActor(loser)).toHaveLength(0);
  });

  it("only one of two concurrent distinct actors wins the claim", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const actorA = harness.actor("actor-a");
    const actorB = harness.actor("actor-b");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    let entered = 0;
    let releaseFirst: (() => void) | undefined;
    const firstAtClaim = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    harness.invitations.beforeClaim = async () => {
      entered += 1;
      if (entered === 1) {
        await firstAtClaim;
      } else {
        releaseFirst?.();
      }
    };

    const [resultA, resultB] = await Promise.all([
      acceptInvite.execute({ token: invite.value.token, actorId: actorA }),
      acceptInvite.execute({ token: invite.value.token, actorId: actorB }),
    ]);

    const outcomes = [resultA, resultB];
    const winners = outcomes.filter((r) => r.isOk());
    const losers = outcomes.filter((r) => !r.isOk());
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    if (!losers[0]!.isOk()) {
      expect(InvitationInvalid.is(losers[0]!.error)).toBe(true);
      expect(losers[0]!.error.code).toBe("organizations.invitation_invalid");
    }

    const winnerId = resultA.isOk() ? actorA : actorB;
    const loserId = resultA.isOk() ? actorB : actorA;
    expect(await harness.memberships.findByActor(winnerId)).toHaveLength(1);
    expect(await harness.memberships.findByActor(loserId)).toHaveLength(0);
  });

  it("is idempotent when the same actor accepts concurrently", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const player = harness.actor("player-1");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    let entered = 0;
    let releaseFirst: (() => void) | undefined;
    const firstAtClaim = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    harness.invitations.beforeClaim = async () => {
      entered += 1;
      if (entered === 1) {
        await firstAtClaim;
      } else {
        releaseFirst?.();
      }
    };

    const [first, second] = await Promise.all([
      acceptInvite.execute({ token: invite.value.token, actorId: player }),
      acceptInvite.execute({ token: invite.value.token, actorId: player }),
    ]);

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;
    expect(second.value).toEqual(first.value);
    expect(await harness.memberships.findByActor(player)).toHaveLength(1);
  });
});

describe("AcceptInvitationUseCase (redeemPolicy multi)", () => {
  it("allows up to maxRedemptions distinct actors then rejects the next one", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
      redeemPolicy: "multi",
      maxRedemptions: 2,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const actorA = harness.actor("actor-a");
    const actorB = harness.actor("actor-b");
    const actorC = harness.actor("actor-c");

    const first = await acceptInvite.execute({ token: invite.value.token, actorId: actorA });
    const second = await acceptInvite.execute({ token: invite.value.token, actorId: actorB });
    const third = await acceptInvite.execute({ token: invite.value.token, actorId: actorC });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(third.isOk()).toBe(false);
    if (!third.isOk()) {
      expect(InvitationExhausted.is(third.error)).toBe(true);
      expect(third.error.code).toBe("organizations.invitation_exhausted");
    }
    expect(await harness.memberships.findByActor(actorA)).toHaveLength(1);
    expect(await harness.memberships.findByActor(actorB)).toHaveLength(1);
    expect(await harness.memberships.findByActor(actorC)).toHaveLength(0);
  });

  it("is idempotent when the same actor redeems the same multi invitation twice", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const player = harness.actor("player-1");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
      redeemPolicy: "multi",
      maxRedemptions: 3,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const first = await acceptInvite.execute({ token: invite.value.token, actorId: player });
    const second = await acceptInvite.execute({ token: invite.value.token, actorId: player });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;
    expect(second.value).toEqual(first.value);
    expect(await harness.memberships.findByActor(player)).toHaveLength(1);

    const stored = await harness.invitations.findByTokenHash(
      harness.tokens.hashToken(invite.value.token),
    );
    expect(stored?.redeemedCount).toBe(1);
  });

  it("does not burn cupo when an existing org member accepts a multi invitation", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const newcomer = harness.actor("newcomer");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
      redeemPolicy: "multi",
      maxRedemptions: 1,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const existingMember = await acceptInvite.execute({
      token: invite.value.token,
      actorId: organizer,
    });
    expect(existingMember.isOk()).toBe(true);
    if (!existingMember.isOk()) return;
    expect(existingMember.value.role).toBe("organizer");
    expect(existingMember.value.competitionRole).toBe("player");

    const storedAfterMember = await harness.invitations.findByTokenHash(
      harness.tokens.hashToken(invite.value.token),
    );
    expect(storedAfterMember?.redeemedCount).toBe(0);

    const firstRealRedeem = await acceptInvite.execute({
      token: invite.value.token,
      actorId: newcomer,
    });
    expect(firstRealRedeem.isOk()).toBe(true);
    if (!firstRealRedeem.isOk()) return;
    expect(firstRealRedeem.value.role).toBe("player");

    const storedAfterNewcomer = await harness.invitations.findByTokenHash(
      harness.tokens.hashToken(invite.value.token),
    );
    expect(storedAfterNewcomer?.redeemedCount).toBe(1);
  });

  it("never lets concurrent claims exceed maxRedemptions cupo", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
      redeemPolicy: "multi",
      maxRedemptions: 2,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;

    const contenders = ["racer-a", "racer-b", "racer-c"].map((id) => harness.actor(id));

    let entered = 0;
    let releaseAll: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => {
      releaseAll = resolve;
    });
    harness.invitations.beforeRedeem = async () => {
      entered += 1;
      if (entered === contenders.length) {
        releaseAll?.();
      }
      await barrier;
    };

    const results = await Promise.all(
      contenders.map((actorId) => acceptInvite.execute({ token: invite.value.token, actorId })),
    );

    const winners = results.filter((result) => result.isOk());
    const losers = results.filter((result) => !result.isOk());
    expect(winners).toHaveLength(2);
    expect(losers).toHaveLength(1);
    for (const loser of losers) {
      if (!loser.isOk()) {
        expect(InvitationExhausted.is(loser.error)).toBe(true);
        expect(loser.error.code).toBe("organizations.invitation_exhausted");
      }
    }

    const stored = await harness.invitations.findByTokenHash(
      harness.tokens.hashToken(invite.value.token),
    );
    expect(stored?.redeemedCount).toBe(2);
  });

  it("leaves single-mode claim semantics unaffected", async () => {
    const harness = createOrgTestHarness();
    const createOrg = new CreateOrganizationUseCase(harness);
    const createInvite = new CreateInvitationUseCase(harness);
    const acceptInvite = new AcceptInvitationUseCase(harness);
    const organizer = harness.actor("org-owner");
    const winner = harness.actor("single-winner");
    const loser = harness.actor("single-loser");

    const org = await createOrg.execute({ name: "Club", actorId: organizer });
    expect(org.isOk()).toBe(true);
    if (!org.isOk()) return;

    const invite = await createInvite.execute({
      organizationId: org.value.organization.id,
      competitionId: asCompetitionId("competition-1"),
      role: "player",
      invitedByActorId: organizer,
    });
    expect(invite.isOk()).toBe(true);
    if (!invite.isOk()) return;
    expect(invite.value.redeemPolicy).toBe("single");

    const first = await acceptInvite.execute({ token: invite.value.token, actorId: winner });
    const second = await acceptInvite.execute({ token: invite.value.token, actorId: loser });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(false);
    if (!second.isOk()) {
      expect(InvitationInvalid.is(second.error)).toBe(true);
      expect(second.error.code).toBe("organizations.invitation_invalid");
    }
  });
});
