import {
  createInvitationResponseSchema,
  createOrganizationResponseSchema,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

describe("apps/api http organizations", () => {
  it("organization resources do not complete onboarding implicitly", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-organizer";
    const staff = "actor-staff";

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Liga Test" }),
    });
    expect(created.status).toBe(201);
    const createdBody = await parseResponse(createOrganizationResponseSchema, created);
    expect(createdBody.organizationId).toBeTruthy();

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders(organizer),
    });
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({
      memberships: [
        {
          organizationId: createdBody.organizationId,
          organizationName: "Liga Test",
          role: "organizer",
        },
      ],
    });

    const destination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(organizer),
    });
    expect(destination.status).toBe(200);
    expect(await destination.json()).toMatchObject({
      destination: { kind: "onboarding" },
    });

    const invite = await app.request(
      `/api/v1/organizations/${createdBody.organizationId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "staff" }),
      },
    );
    expect(invite.status).toBe(201);
    const inviteBody = await parseResponse(createInvitationResponseSchema, invite);

    const accepted = await app.request("/api/v1/organizations/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(staff),
      body: JSON.stringify({ token: inviteBody.token }),
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      organizationId: createdBody.organizationId,
      role: "staff",
    });

    const staffOnboarding = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(staff),
    });
    expect(await staffOnboarding.json()).toMatchObject({
      completed: false,
      path: null,
    });
  });

  it("organization invitations: a multi redeemPolicy invitation admits up to maxRedemptions distinct actors", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-multi-organizer";

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Liga Multi" }),
    });
    expect(created.status).toBe(201);
    const { organizationId } = await parseResponse(createOrganizationResponseSchema, created);

    const invite = await app.request(`/api/v1/organizations/${organizationId}/invitations`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ role: "staff", redeemPolicy: "multi", maxRedemptions: 2 }),
    });
    expect(invite.status).toBe(201);
    const inviteBody = await parseResponse(createInvitationResponseSchema, invite);
    expect(inviteBody).toMatchObject({ redeemPolicy: "multi", maxRedemptions: 2 });

    const acceptAs = (actorId: string) =>
      app.request("/api/v1/organizations/invitations/accept", {
        method: "POST",
        headers: serviceHeaders(actorId),
        body: JSON.stringify({ token: inviteBody.token }),
      });

    const first = await acceptAs("actor-multi-staff-1");
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ organizationId, role: "staff" });

    const second = await acceptAs("actor-multi-staff-2");
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ organizationId, role: "staff" });

    const third = await acceptAs("actor-multi-staff-3");
    expect(third.status).toBe(409);
    expect(await third.json()).toMatchObject({ code: "organizations.invitation_exhausted" });

    const firstAgain = await acceptAs("actor-multi-staff-1");
    expect(firstAgain.status).toBe(200);
    expect(await firstAgain.json()).toMatchObject({ organizationId, role: "staff" });
  });

  it("organizations: checks and enforces globally unique normalized names", async () => {
    const app = buildApp(stubFetch);
    const firstActor = "actor-name-owner";

    const initiallyAvailable = await app.request("/api/v1/organizations/name-availability", {
      method: "POST",
      headers: serviceHeaders(firstActor),
      body: JSON.stringify({ name: "Liga Global" }),
    });
    expect(await initiallyAvailable.json()).toEqual({ available: true });

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(firstActor),
      body: JSON.stringify({ name: "Liga  Global" }),
    });
    expect(created.status).toBe(201);

    const unavailable = await app.request("/api/v1/organizations/name-availability", {
      method: "POST",
      headers: serviceHeaders("actor-name-contender"),
      body: JSON.stringify({ name: "  LIGA GLOBAL  " }),
    });
    expect(await unavailable.json()).toEqual({ available: false });

    const duplicate = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders("actor-name-contender"),
      body: JSON.stringify({ name: "liga global" }),
    });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ code: "organizations.name_conflict" });
  });

  it("organizations routes reject missing service auth", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/organizations/mine");

    expect(res.status).toBe(401);
  });
});
