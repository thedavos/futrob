import { asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import {
  InvalidOrganizationName,
  InvalidOrganizationSlug,
  InvalidOrganizationTimeZone,
  OrganizationNameConflict,
  OrganizationSlugConflict,
} from "../../domain/errors/organization.errors.ts";
import {
  OrganizationForbidden,
  OrganizationNotFound,
} from "../../domain/errors/invitation.errors.ts";
import { CreateOrganizationUseCase } from "../create-organization/create-organization.use-case.ts";
import { createOrgTestHarness } from "../test-harness.ts";
import { UpdateOrganizationProfileUseCase } from "./update-organization-profile.use-case.ts";

async function setup() {
  const harness = createOrgTestHarness();
  const create = new CreateOrganizationUseCase(harness);
  const organizer = harness.actor("organizer");
  const created = await create.execute({
    name: "Liga Norte",
    slug: "liga-norte",
    actorId: organizer,
    timeZone: "UTC",
  });
  if (!created.isOk()) throw created.error;
  const rival = await create.execute({
    name: "Liga Sur",
    slug: "liga-sur",
    actorId: harness.actor("rival"),
    timeZone: "UTC",
  });
  if (!rival.isOk()) throw rival.error;
  return {
    harness,
    update: new UpdateOrganizationProfileUseCase(harness),
    organizationId: created.value.organization.id,
    organizer,
  };
}

describe("UpdateOrganizationProfileUseCase", () => {
  it("changes name, slug and time zone together", async () => {
    const { update, organizationId, organizer } = await setup();

    const result = await update.execute({
      organizationId,
      actorId: organizer,
      name: "  Liga del Norte ",
      slug: "norte-fc",
      timeZone: "America/Lima",
    });

    expect(result.isOk() && result.value).toMatchObject({
      id: organizationId,
      name: "Liga del Norte",
      slug: "norte-fc",
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
    });
  });

  it("keeps the fields that are not sent", async () => {
    const { update, organizationId, organizer } = await setup();

    const result = await update.execute({
      organizationId,
      actorId: organizer,
      timeZone: "Europe/Madrid",
    });

    expect(result.isOk() && result.value).toMatchObject({
      name: "Liga Norte",
      slug: "liga-norte",
      timeZone: "Europe/Madrid",
    });
  });

  it("accepts the organization's own slug and name again", async () => {
    const { update, organizationId, organizer } = await setup();

    const result = await update.execute({
      organizationId,
      actorId: organizer,
      name: "LIGA NORTE",
      slug: "liga-norte",
    });

    expect(result.isOk() && result.value).toMatchObject({ name: "LIGA NORTE", slug: "liga-norte" });
  });

  it("rejects a slug owned by another organization and changes nothing", async () => {
    const { harness, update, organizationId, organizer } = await setup();

    const result = await update.execute({
      organizationId,
      actorId: organizer,
      name: "Nuevo nombre",
      slug: "liga-sur",
    });

    expect(result.isErr() && OrganizationSlugConflict.is(result.error)).toBe(true);
    expect(await harness.organizations.getById(organizationId)).toMatchObject({
      name: "Liga Norte",
      slug: "liga-norte",
    });
  });

  it("rejects a name owned by another organization", async () => {
    const { update, organizationId, organizer } = await setup();

    const result = await update.execute({
      organizationId,
      actorId: organizer,
      name: " liga  SUR ",
    });

    expect(result.isErr() && OrganizationNameConflict.is(result.error)).toBe(true);
  });

  it("answers a slug conflict when the slug is taken between the check and the write", async () => {
    const { harness, update, organizationId, organizer } = await setup();
    const getBySlug = harness.organizations.getBySlug.bind(harness.organizations);
    let firstLookup = true;
    harness.organizations.getBySlug = async (slug) => {
      if (firstLookup) {
        firstLookup = false;
        return null;
      }
      return getBySlug(slug);
    };

    const result = await update.execute({ organizationId, actorId: organizer, slug: "liga-sur" });

    expect(result.isErr() && OrganizationSlugConflict.is(result.error)).toBe(true);
  });

  it.each([
    ["an empty name", { name: "  " }, InvalidOrganizationName],
    ["a long name", { name: "a".repeat(121) }, InvalidOrganizationName],
    ["a reserved slug", { slug: "admin" }, InvalidOrganizationSlug],
    ["a slug with uppercase", { slug: "Liga-Norte" }, InvalidOrganizationSlug],
    ["an unknown time zone", { timeZone: "Nowhere/City" }, InvalidOrganizationTimeZone],
  ])("rejects %s", async (_label, change, errorClass) => {
    const { update, organizationId, organizer } = await setup();

    const result = await update.execute({ organizationId, actorId: organizer, ...change });

    expect(result.isErr() && errorClass.is(result.error)).toBe(true);
  });

  it("forbids staff, members and outsiders from editing the profile", async () => {
    const { harness, update, organizationId } = await setup();
    await harness.memberships.add({
      organizationId,
      actorId: harness.actor("staff"),
      role: "staff",
      createdAt: new Date(),
    });
    await harness.memberships.add({
      organizationId,
      actorId: harness.actor("member"),
      role: "member",
      createdAt: new Date(),
    });

    for (const actor of ["staff", "member", "outsider"]) {
      const result = await update.execute({
        organizationId,
        actorId: harness.actor(actor),
        name: "Hackeada",
      });
      expect(result.isErr() && OrganizationForbidden.is(result.error), actor).toBe(true);
    }
    expect(await harness.organizations.getById(organizationId)).toMatchObject({
      name: "Liga Norte",
    });
  });

  it("reports an unknown organization", async () => {
    const { update, organizer } = await setup();

    const result = await update.execute({
      organizationId: asOrganizationId("missing"),
      actorId: organizer,
      name: "X",
    });

    expect(result.isErr() && OrganizationNotFound.is(result.error)).toBe(true);
  });
});
