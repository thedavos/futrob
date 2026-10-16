import {
  listOrganizationMembersResponseSchema,
  createOrganizationResponseSchema,
  createInvitationResponseSchema,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

async function setup() {
  const app = buildApp(stubFetch);
  const created = await app.request("/api/v1/organizations", {
    method: "POST",
    headers: serviceHeaders("organizer"),
    body: JSON.stringify({ name: "Member contract", timeZone: "UTC" }),
  });
  const { organizationId } = await parseResponse(createOrganizationResponseSchema, created);
  return { app, organizationId, path: `/api/v1/organizations/${organizationId}/members` };
}

describe("organization member directory HTTP", () => {
  it("uses trusted identity and returns the complete member wire shape after an invitation is accepted", async () => {
    const { app, organizationId, path } = await setup();
    const invitation = await app.request(`/api/v1/organizations/${organizationId}/invitations`, {
      method: "POST",
      headers: serviceHeaders("organizer"),
      body: JSON.stringify({ role: "staff" }),
    });
    const { token } = await parseResponse(createInvitationResponseSchema, invitation);
    const before = await app.request(path, { headers: serviceHeaders("organizer") });
    expect(
      (await parseResponse(listOrganizationMembersResponseSchema, before)).members,
    ).toHaveLength(1);
    await app.request("/api/v1/organizations/invitations/accept", {
      method: "POST",
      headers: serviceHeaders("staff"),
      body: JSON.stringify({ token }),
    });
    const response = await app.request(path, { headers: serviceHeaders("staff") });
    expect(response.status).toBe(200);
    const { members } = await parseResponse(listOrganizationMembersResponseSchema, response);
    expect(members).toHaveLength(2);
    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: "staff",
          displayName: null,
          email: null,
          role: "staff",
          joinedAt: expect.any(String),
          access: { kind: "inherited" },
        }),
      ]),
    );
  });

  it.each(["limit=1", "search=test", "actorId=organizer", "cursor=next", "role=staff"])(
    "rejects unsupported query %s",
    async (query) => {
      const { app, path } = await setup();
      const response = await app.request(`${path}?${query}`, {
        headers: serviceHeaders("organizer"),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "api.validation_error" });
    },
  );

  it("rejects anonymous, foreign tenant and absent tenant reads", async () => {
    const { app, path } = await setup();
    expect((await app.request(path)).status).toBe(401);
    expect((await app.request(path, { headers: serviceHeaders("outsider") })).status).toBe(403);
    expect(
      (
        await app.request("/api/v1/organizations/missing/members", {
          headers: serviceHeaders("organizer"),
        })
      ).status,
    ).toBe(404);
  });
});
