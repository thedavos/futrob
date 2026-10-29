import {
  accessGrantSchema,
  createInvitationResponseSchema,
  createOrganizationResponseSchema,
  organizationRoleAssignmentSchema,
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
      body: JSON.stringify({ name: "Authorization Org", timeZone: "UTC" }),
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
      body: JSON.stringify({ name: "Other Authorization Org", timeZone: "UTC" }),
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

  it("authorization: changes organization roles only within the manager's authority", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-role-organizer";
    const staff = "actor-role-staff";
    const member = "actor-role-member";
    const outsider = "actor-role-outsider";
    const organizationId = await createOrganization(app, organizer, "Roles Org");
    await joinOrganization(app, organizationId, organizer, staff, "staff");
    await joinOrganization(app, organizationId, organizer, member, "member");
    await createOrganization(app, outsider, "Outsider Org");
    const changeRole = (actorId: string, targetActorId: string, body: unknown) =>
      app.request(`/api/v1/organizations/${organizationId}/members/${targetActorId}/role`, {
        method: "PATCH",
        headers: serviceHeaders(actorId),
        body: JSON.stringify(body),
      });

    expect((await changeRole(staff, member, { role: "staff" })).status).toBe(403);
    expect((await changeRole(outsider, member, { role: "staff" })).status).toBe(403);
    expect((await changeRole(organizer, member, { role: "owner" })).status).toBe(400);
    expect((await changeRole(organizer, "actor-role-unknown", { role: "staff" })).status).toBe(404);
    expect((await changeRole(organizer, organizer, { role: "member" })).status).toBe(409);

    const promoted = await changeRole(organizer, member, {
      role: "staff",
      reason: "Ayuda con las inscripciones",
    });
    expect(promoted.status).toBe(200);
    expect(await parseResponse(organizationRoleAssignmentSchema, promoted)).toMatchObject({
      organizationId,
      actorId: member,
      role: "staff",
    });
    const access = await app.request(
      `/api/v1/authorization/effective-access?organizationId=${organizationId}&permissions=organizations.memberships.read`,
      { headers: serviceHeaders(member) },
    );
    expect(await access.json()).toMatchObject({
      permissions: [{ permission: "organizations.memberships.read", allowed: true }],
    });

    const delegated = await app.request("/api/v1/authorization/grants", {
      method: "PUT",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        targetActorId: staff,
        organizationId,
        permission: "authorization.roles.manage",
        effect: "allow",
        scopeType: "organization",
        scopeId: organizationId,
      }),
    });
    expect(delegated.status).toBe(200);
    expect((await changeRole(staff, organizer, { role: "member" })).status).toBe(403);
    const organizerAccess = await app.request(
      `/api/v1/authorization/effective-access?organizationId=${organizationId}&permissions=authorization.roles.manage`,
      { headers: serviceHeaders(organizer) },
    );
    expect(await organizerAccess.json()).toMatchObject({
      permissions: [{ permission: "authorization.roles.manage", allowed: true }],
    });
  });
});

async function createOrganization(
  app: ReturnType<typeof buildApp>,
  actorId: string,
  name: string,
): Promise<string> {
  const created = await app.request("/api/v1/organizations", {
    method: "POST",
    headers: serviceHeaders(actorId),
    body: JSON.stringify({ name, timeZone: "UTC" }),
  });
  return (await parseResponse(createOrganizationResponseSchema, created)).organizationId;
}

async function joinOrganization(
  app: ReturnType<typeof buildApp>,
  organizationId: string,
  organizer: string,
  actorId: string,
  role: "staff" | "member",
): Promise<void> {
  const invitation = await app.request(`/api/v1/organizations/${organizationId}/invitations`, {
    method: "POST",
    headers: serviceHeaders(organizer),
    body: JSON.stringify({ role }),
  });
  const { token } = await parseResponse(createInvitationResponseSchema, invitation);
  const accepted = await app.request("/api/v1/organizations/invitations/accept", {
    method: "POST",
    headers: serviceHeaders(actorId),
    body: JSON.stringify({ token }),
  });
  expect(accepted.ok).toBe(true);
}
