import { EnqueueEmailsUseCase } from "@futrob/notifications";
import { RESULT_PERMISSION } from "@futrob/results";
import { describe, expect, it } from "vite-plus/test";
import {
  createRbacMatrixFixture,
  RBAC_MATRIX_NOW,
} from "@/adapters/authorization/rbac-matrix.fixture.ts";
import { ActivityAudienceEmailRecipients } from "./email-audience.bridges.ts";
import { InMemoryEmailOutboxRepository } from "./email-outbox.in-memory.repository.ts";

async function setup() {
  const fixture = await createRbacMatrixFixture();
  const outbox = new InMemoryEmailOutboxRepository();
  let next = 0;
  const enqueue = new EnqueueEmailsUseCase({
    outbox,
    recipients: new ActivityAudienceEmailRecipients({
      memberships: fixture.organizationMemberships,
      rosters: fixture.rosters,
      profiles: fixture.profiles,
      authorization: fixture.authorization,
    }),
    clock: { now: () => RBAC_MATRIX_NOW },
    ids: { generate: () => `delivery-${++next}` },
  });
  const disputeToOrganization = (eventId: string) =>
    enqueue.execute({
      eventId,
      organizationId: fixture.ids.orgA,
      actorId: fixture.actors.rivalCaptain,
      audiences: [
        {
          audience: {
            audience: "organization",
            audienceId: fixture.ids.orgA,
            organizationId: fixture.ids.orgA,
            competitionId: null,
          },
          intent: {
            template: "result_or_dispute",
            result: "disputed",
            path: "/orgs/a",
            competitionName: "Comp A",
            encounterLabel: null,
            teamName: null,
          },
        },
      ],
    });
  return { fixture, outbox, disputeToOrganization };
}

describe("ActivityAudienceEmailRecipients", () => {
  it("emails the organization to the members the organization feed admits", async () => {
    const { fixture, disputeToOrganization } = await setup();

    const deliveries = await disputeToOrganization("event-allowed");

    expect(deliveries.map((delivery) => delivery.recipientActorId).sort()).toEqual(
      [fixture.actors.organizer, fixture.actors.organizationStaff].sort(),
    );
  });

  it("does not email a staff member with an explicit deny of the feed permission", async () => {
    const { fixture, outbox, disputeToOrganization } = await setup();
    await fixture.grants.upsert({
      id: "deny-result-approve",
      organizationId: fixture.ids.orgA,
      actorId: fixture.actors.organizationStaff,
      permission: RESULT_PERMISSION.resultApprove,
      effect: "deny",
      scopeType: "organization",
      scopeId: fixture.ids.orgA,
      grantedByActorId: fixture.actors.organizer,
      reason: null,
      createdAt: RBAC_MATRIX_NOW,
      updatedAt: RBAC_MATRIX_NOW,
    });
    const decision = await fixture.authorization.decide({
      actorId: fixture.actors.organizationStaff,
      permission: RESULT_PERMISSION.resultApprove,
      scope: { organizationId: fixture.ids.orgA },
    });
    expect(decision).toMatchObject({ allowed: false, reason: "denied" });

    await disputeToOrganization("event-denied");

    expect(
      (await outbox.listByEvent("event-denied")).map((delivery) => delivery.recipientActorId),
    ).toEqual([fixture.actors.organizer]);
  });
});
