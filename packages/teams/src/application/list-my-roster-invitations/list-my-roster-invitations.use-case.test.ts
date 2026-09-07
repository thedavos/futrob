import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { RosterInvitation } from "../../domain/entities/roster-invitation.ts";
import { ROSTER_INVITATION_STATUS } from "../../domain/entities/roster-invitation.ts";
import { FakeRosterInvitationRepository } from "../roster-invitation-test-harness.ts";
import { ListMyRosterInvitationsUseCase } from "./list-my-roster-invitations.use-case.ts";

function invitation(overrides: Partial<RosterInvitation> & { id: string }): RosterInvitation {
  return {
    organizationId: asOrganizationId("org-1"),
    competitionId: asCompetitionId("comp-1"),
    teamId: asTeamId("team-1"),
    role: "player",
    tokenHash: `hash-${overrides.id}`,
    status: ROSTER_INVITATION_STATUS.pending,
    invitedByActorId: asActorId("captain-1"),
    invitedByDisplayName: "Alex Rojas",
    invitedByGamertag: "CapiAlex",
    inviteeActorId: asActorId("player-1"),
    inviteeIdentifier: "davos282",
    message: null,
    expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    acceptedByActorId: null,
    respondedAt: null,
    createdAt: new Date("2026-01-10T00:00:00.000Z"),
    redeemPolicy: "single",
    ...overrides,
  };
}

describe("ListMyRosterInvitationsUseCase", () => {
  it("returns only invitations directed at the actor, newest first", async () => {
    const invitations = new FakeRosterInvitationRepository();
    await invitations.create(
      invitation({ id: "old", createdAt: new Date("2026-01-01T00:00:00.000Z") }),
    );
    await invitations.create(
      invitation({ id: "new", createdAt: new Date("2026-01-12T00:00:00.000Z") }),
    );
    await invitations.create(
      invitation({ id: "other", inviteeActorId: asActorId("someone-else") }),
    );
    await invitations.create(invitation({ id: "link", inviteeActorId: null }));

    const useCase = new ListMyRosterInvitationsUseCase({ invitations });
    const result = await useCase.execute({ actorId: asActorId("player-1") });

    expect(result.map((entry) => entry.id)).toEqual(["new", "old"]);
  });

  it("includes non-pending invitations for the history view", async () => {
    const invitations = new FakeRosterInvitationRepository();
    await invitations.create(invitation({ id: "declined", status: "declined" }));
    await invitations.create(invitation({ id: "accepted", status: "accepted" }));

    const useCase = new ListMyRosterInvitationsUseCase({ invitations });
    const result = await useCase.execute({ actorId: asActorId("player-1") });

    expect(result).toHaveLength(2);
  });
});
