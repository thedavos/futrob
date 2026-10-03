import {
  createInvitationResponseSchema,
  createOrganizationResponseSchema,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

type App = ReturnType<typeof buildApp>;

async function createOrganization(
  app: App,
  actor: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return app.request("/api/v1/organizations", {
    method: "POST",
    headers: serviceHeaders(actor),
    body: JSON.stringify(body),
  });
}

async function createdOrganizationId(response: Response): Promise<string> {
  expect(response.status).toBe(201);
  return (await parseResponse(createOrganizationResponseSchema, response)).organizationId;
}

function patchProfile(app: App, actor: string, organizationId: string, body: unknown) {
  return app.request(`/api/v1/organizations/${organizationId}`, {
    method: "PATCH",
    headers: serviceHeaders(actor),
    body: JSON.stringify(body),
  });
}

async function joinAs(
  app: App,
  organizer: string,
  organizationId: string,
  role: string,
  actor: string,
) {
  const invite = await app.request(`/api/v1/organizations/${organizationId}/invitations`, {
    method: "POST",
    headers: serviceHeaders(organizer),
    body: JSON.stringify({ role }),
  });
  const { token } = await parseResponse(createInvitationResponseSchema, invite);
  const accepted = await app.request("/api/v1/organizations/invitations/accept", {
    method: "POST",
    headers: serviceHeaders(actor),
    body: JSON.stringify({ token }),
  });
  expect(accepted.status).toBe(200);
}

describe("apps/api http organization profile", () => {
  it("creates with a derived slug, the given time zone and a monogram", async () => {
    const app = buildApp(stubFetch);

    const response = await createOrganization(app, "actor-1", {
      name: "Liga Ñandú",
      timeZone: "America/Lima",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      name: "Liga Ñandú",
      slug: "liga-nandu",
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
      role: "organizer",
    });
  });

  it("lists the slug and logo with each membership", async () => {
    const app = buildApp(stubFetch);
    await createOrganization(app, "actor-1", { name: "Liga Norte", timeZone: "UTC" });

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders("actor-1"),
    });

    expect(await mine.json()).toMatchObject({
      memberships: [
        {
          organizationName: "Liga Norte",
          organizationSlug: "liga-norte",
          organizationLogo: { kind: "monogram" },
          role: "organizer",
        },
      ],
    });
  });

  it("rejects a missing or invalid time zone and an invalid slug with typed codes", async () => {
    const app = buildApp(stubFetch);

    const missingZone = await createOrganization(app, "actor-1", { name: "Liga Norte" });
    const badZone = await createOrganization(app, "actor-1", {
      name: "Liga Norte",
      timeZone: "Nowhere/City",
    });
    const badSlug = await createOrganization(app, "actor-1", {
      name: "Liga Norte",
      timeZone: "UTC",
      slug: "Liga Norte",
    });

    expect(missingZone.status).toBe(400);
    expect(await missingZone.json()).toMatchObject({ code: "api.validation_error" });
    expect(badZone.status).toBe(400);
    expect(await badZone.json()).toMatchObject({ code: "organizations.invalid_time_zone" });
    expect(badSlug.status).toBe(400);
    expect(await badSlug.json()).toMatchObject({ code: "organizations.invalid_slug" });
  });

  it("answers 409 slug_conflict when another organization owns the slug", async () => {
    const app = buildApp(stubFetch);
    await createOrganization(app, "actor-1", {
      name: "Liga Norte",
      timeZone: "UTC",
      slug: "norte",
    });

    const duplicate = await createOrganization(app, "actor-2", {
      name: "Otra Liga",
      timeZone: "UTC",
      slug: "norte",
    });

    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ code: "organizations.slug_conflict" });
  });

  it("checks slug availability with a suggestion and lets the owner keep its own slug", async () => {
    const app = buildApp(stubFetch);
    const organizationId = await createdOrganizationId(
      await createOrganization(app, "actor-1", { name: "Liga Norte", timeZone: "UTC" }),
    );
    const check = async (body: unknown) =>
      (
        await app.request("/api/v1/organizations/slug-availability", {
          method: "POST",
          headers: serviceHeaders("actor-2"),
          body: JSON.stringify(body),
        })
      ).json();

    expect(await check({ slug: "liga-sur" })).toEqual({ available: true });
    expect(await check({ slug: "liga-norte" })).toEqual({
      available: false,
      reason: "taken",
      suggestion: "liga-norte-2",
    });
    expect(await check({ slug: "liga-norte", organizationId })).toEqual({ available: true });
    expect(await check({ slug: "admin" })).toEqual({
      available: false,
      reason: "invalid",
      suggestion: "admin-2",
    });
  });

  it("does not replay another actor's creationKey to join their organization", async () => {
    const app = buildApp(stubFetch);
    const victim = await createdOrganizationId(
      await createOrganization(app, "actor-victim", { name: "Liga Victima", timeZone: "UTC" }),
    );

    const attacker = await createOrganization(app, "actor-attacker", {
      name: "Liga Atacante",
      timeZone: "UTC",
      creationKey: "onboarding:organization:actor-victim",
    });

    expect(attacker.status).toBe(400);
    const retriedA = await createOrganization(app, "actor-attacker", {
      name: "Liga Atacante",
      timeZone: "UTC",
      creationKey: "my-key",
    });
    const retriedB = await createOrganization(app, "actor-attacker", {
      name: "Liga Atacante",
      timeZone: "UTC",
      creationKey: "my-key",
    });
    const idA = await createdOrganizationId(retriedA);
    expect(await createdOrganizationId(retriedB)).toBe(idA);
    expect(idA).not.toBe(victim);
  });

  it("lets the organizer read and patch the profile, and members only read it", async () => {
    const app = buildApp(stubFetch);
    const organizationId = await createdOrganizationId(
      await createOrganization(app, "organizer", { name: "Liga Norte", timeZone: "UTC" }),
    );
    await joinAs(app, "organizer", organizationId, "member", "member");

    const patched = await patchProfile(app, "organizer", organizationId, {
      name: "Liga del Norte",
      slug: "norte-fc",
      timeZone: "America/Lima",
    });
    const asMember = await app.request(`/api/v1/organizations/${organizationId}`, {
      headers: serviceHeaders("member"),
    });
    const asOutsider = await app.request(`/api/v1/organizations/${organizationId}`, {
      headers: serviceHeaders("outsider"),
    });
    const memberPatch = await patchProfile(app, "member", organizationId, { name: "Hackeada" });

    expect(patched.status).toBe(200);
    expect(await patched.json()).toEqual({
      organizationId,
      name: "Liga del Norte",
      slug: "norte-fc",
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
    });
    expect(await asMember.json()).toMatchObject({ slug: "norte-fc", timeZone: "America/Lima" });
    expect(asOutsider.status).toBe(403);
    expect(memberPatch.status).toBe(403);
    const unchanged = await app.request(`/api/v1/organizations/${organizationId}`, {
      headers: serviceHeaders("organizer"),
    });
    expect(await unchanged.json()).toMatchObject({ name: "Liga del Norte" });
  });

  it("rejects an empty patch and a slug owned by another organization", async () => {
    const app = buildApp(stubFetch);
    await createOrganization(app, "actor-2", {
      name: "Liga Sur",
      timeZone: "UTC",
      slug: "liga-sur",
    });
    const organizationId = await createdOrganizationId(
      await createOrganization(app, "organizer", { name: "Liga Norte", timeZone: "UTC" }),
    );

    const empty = await patchProfile(app, "organizer", organizationId, {});
    const taken = await patchProfile(app, "organizer", organizationId, { slug: "liga-sur" });

    expect(empty.status).toBe(400);
    expect(taken.status).toBe(409);
    expect(await taken.json()).toMatchObject({ code: "organizations.slug_conflict" });
  });

  it("registers an uploaded logo only inside the organization's own prefix", async () => {
    const app = buildApp(stubFetch);
    const organizationId = await createdOrganizationId(
      await createOrganization(app, "organizer", { name: "Liga Norte", timeZone: "UTC" }),
    );
    const setLogo = (actor: string, logo: unknown) =>
      app.request(`/api/v1/organizations/${organizationId}/logo`, {
        method: "PUT",
        headers: serviceHeaders(actor),
        body: JSON.stringify({ logo }),
      });
    const key = `organization-logos/${organizationId}/crest-1.png`;

    const ok = await setLogo("organizer", { kind: "upload", key });
    const foreign = await setLogo("organizer", {
      kind: "upload",
      key: "organization-logos/other-org/crest-1.png",
    });
    const outsider = await setLogo("outsider", { kind: "monogram" });

    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ logo: { kind: "upload", key } });
    expect(foreign.status).toBe(400);
    expect(await foreign.json()).toMatchObject({ code: "organizations.invalid_logo" });
    expect(outsider.status).toBe(403);
    const profile = await app.request(`/api/v1/organizations/${organizationId}`, {
      headers: serviceHeaders("organizer"),
    });
    expect(await profile.json()).toMatchObject({ logo: { kind: "upload", key } });
  });
});
