import {
  accessGrantSchema,
  createInvitationResponseSchema,
  createOrganizationResponseSchema,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

describe("apps/api http authorization", () => {
  it("authorization: resolves grants without crossing tenant scopes", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-auth-organizer";
    const member = "actor-auth-member";
    const otherOrganizer = "actor-auth-other-organizer";

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Authorization Org" }),
    });
    const { organizationId } = await parseResponse(createOrganizationResponseSchema, created);
    const invitation = await app.request(`/api/v1/organizations/${organizationId}/invitations`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ role: "member" }),
    });
    const { token } = await parseResponse(createInvitationResponseSchema, invitation);
    await app.request("/api/v1/organizations/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(member),
      body: JSON.stringify({ token }),
    });

    const denied = await app.request(
      `/api/v1/authorization/effective-access?organizationId=${organizationId}&permissions=organizations.update`,
      { headers: serviceHeaders(member) },
    );
    expect(await denied.json()).toMatchObject({
      permissions: [{ permission: "organizations.update", allowed: false }],
    });

    const granted = await app.request("/api/v1/authorization/grants", {
      method: "PUT",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        targetActorId: member,
        organizationId,
        permission: "organizations.update",
        effect: "allow",
        scopeType: "organization",
        scopeId: organizationId,
      }),
    });
    expect(granted.status).toBe(200);
    const grant = await parseResponse(accessGrantSchema, granted);
    const listed = await app.request(
      `/api/v1/authorization/grants?organizationId=${organizationId}&scopeType=organization&scopeId=${organizationId}&targetActorId=${member}`,
      { headers: serviceHeaders(organizer) },
    );
    expect(await listed.json()).toMatchObject({
      grants: [{ id: grant.id, actorId: member, permission: "organizations.update" }],
    });

    const allowed = await app.request(
      `/api/v1/authorization/effective-access?organizationId=${organizationId}&permissions=organizations.update`,
      { headers: serviceHeaders(member) },
    );
    expect(await allowed.json()).toMatchObject({
      permissions: [{ permission: "organizations.update", allowed: true }],
    });

    const other = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(otherOrganizer),
      body: JSON.stringify({ name: "Other Authorization Org" }),
    });
    const { organizationId: otherOrganizationId } = await parseResponse(
      createOrganizationResponseSchema,
      other,
    );
    const crossTenantDelete = await app.request(
      `/api/v1/authorization/grants/${grant.id}?organizationId=${otherOrganizationId}`,
      { method: "DELETE", headers: serviceHeaders(otherOrganizer) },
    );
    expect(crossTenantDelete.status).toBe(404);
  });
});
