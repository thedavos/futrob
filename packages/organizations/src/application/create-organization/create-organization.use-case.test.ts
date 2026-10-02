import { describe, expect, it } from "vite-plus/test";
import {
  InvalidOrganizationName,
  InvalidOrganizationSlug,
  InvalidOrganizationTimeZone,
  OrganizationNameConflict,
  OrganizationSlugConflict,
} from "../../domain/errors/organization.errors.ts";
import { createOrgTestHarness } from "../test-harness.ts";
import { CreateOrganizationUseCase } from "./create-organization.use-case.ts";

describe("CreateOrganizationUseCase", () => {
  it("creates an organization with a derived slug, a monogram and an organizer membership", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    const actorId = harness.actor("actor-1");

    const result = await useCase.execute({
      name: "  Liga Norte  ",
      actorId,
      timeZone: "America/Lima",
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.role).toBe("organizer");
    expect(result.value.organization).toMatchObject({
      name: "Liga Norte",
      slug: "liga-norte",
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
    });

    expect(await harness.memberships.findByActor(actorId)).toEqual([
      {
        organizationId: result.value.organization.id,
        organizationName: "Liga Norte",
        organizationSlug: "liga-norte",
        organizationLogo: { kind: "monogram" },
        role: "organizer",
      },
    ]);
  });

  it("keeps an explicit slug", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);

    const result = await useCase.execute({
      name: "Liga Norte",
      slug: "norte-fc",
      actorId: harness.actor("actor-1"),
      timeZone: "UTC",
    });

    expect(result.isOk() && result.value.organization.slug).toBe("norte-fc");
  });

  it("numbers the derived slug when another organization already owns it", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    await useCase.execute({
      name: "Liga Norte",
      slug: "liga-sur",
      actorId: harness.actor("actor-1"),
      timeZone: "UTC",
    });

    const first = await useCase.execute({
      name: "Liga Sur",
      actorId: harness.actor("actor-2"),
      timeZone: "UTC",
    });
    const second = await useCase.execute({
      name: "Liga  sur!",
      actorId: harness.actor("actor-3"),
      timeZone: "UTC",
    });

    expect(first.isOk() && first.value.organization.slug).toBe("liga-sur-2");
    expect(second.isOk() && second.value.organization.slug).toBe("liga-sur-3");
  });

  it("rejects an empty name and a name over 120 characters", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    const actorId = harness.actor("a");

    const empty = await useCase.execute({ name: "   ", actorId, timeZone: "UTC" });
    const long = await useCase.execute({ name: "a".repeat(121), actorId, timeZone: "UTC" });

    expect(empty.isErr() && InvalidOrganizationName.is(empty.error)).toBe(true);
    expect(long.isErr() && InvalidOrganizationName.is(long.error)).toBe(true);
  });

  it("rejects a time zone that is not an IANA zone", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);

    const result = await useCase.execute({
      name: "Liga Norte",
      actorId: harness.actor("a"),
      timeZone: "Mars/Olympus_Mons",
    });

    expect(result.isErr() && InvalidOrganizationTimeZone.is(result.error)).toBe(true);
    expect(harness.organizations.byId.size).toBe(0);
  });

  it.each(["Liga Norte", "ab", "admin", "liga--norte"])("rejects the slug %j", async (slug) => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);

    const result = await useCase.execute({
      name: "Liga Norte",
      slug,
      actorId: harness.actor("a"),
      timeZone: "UTC",
    });

    expect(result.isErr() && InvalidOrganizationSlug.is(result.error)).toBe(true);
    expect(harness.organizations.byId.size).toBe(0);
  });

  it("rejects a slug owned by another organization and stores nothing", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    await useCase.execute({
      name: "Liga Norte",
      slug: "norte-fc",
      actorId: harness.actor("actor-1"),
      timeZone: "UTC",
    });

    const result = await useCase.execute({
      name: "Otra Liga",
      slug: "norte-fc",
      actorId: harness.actor("actor-2"),
      timeZone: "UTC",
    });

    expect(result.isErr() && OrganizationSlugConflict.is(result.error)).toBe(true);
    expect(harness.organizations.byId.size).toBe(1);
    expect(harness.memberships.rows).toHaveLength(1);
  });

  it("answers a slug conflict when the slug is taken between the check and the write", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    const stolen = {
      ...(await seedOrganization(harness, "Rival", "norte-fc")),
    };
    // The slug looks free to the pre-check but the write loses the race.
    const getBySlug = harness.organizations.getBySlug.bind(harness.organizations);
    let firstLookup = true;
    harness.organizations.getBySlug = async (slug) => {
      if (firstLookup) {
        firstLookup = false;
        return null;
      }
      return getBySlug(slug);
    };

    const result = await useCase.execute({
      name: "Liga Norte",
      slug: stolen.slug,
      actorId: harness.actor("actor-2"),
      timeZone: "UTC",
    });

    expect(result.isErr() && OrganizationSlugConflict.is(result.error)).toBe(true);
  });

  it("returns the same organization when an onboarding creation is retried", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    const input = {
      name: "Liga Norte",
      actorId: harness.actor("actor-1"),
      timeZone: "UTC",
      creationKey: "onboarding:organization:actor-1",
    };

    const first = await useCase.execute(input);
    const retried = await useCase.execute(input);

    expect(first.isOk() && retried.isOk() && retried.value.organization.id).toBe(
      first.isOk() ? first.value.organization.id : "",
    );
    expect(harness.organizations.byId.size).toBe(1);
    expect(harness.memberships.rows).toHaveLength(1);
  });

  it("rejects an equivalent organization name", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);

    const first = await useCase.execute({
      name: "Liga  Norte",
      actorId: harness.actor("actor-1"),
      timeZone: "UTC",
    });
    const duplicate = await useCase.execute({
      name: "  LIGA NORTE  ",
      actorId: harness.actor("actor-2"),
      timeZone: "UTC",
    });

    expect(first.isOk()).toBe(true);
    expect(duplicate.isErr() && OrganizationNameConflict.is(duplicate.error)).toBe(true);
    expect(harness.organizations.byId.size).toBe(1);
    expect(harness.memberships.rows).toHaveLength(1);
  });
});

async function seedOrganization(
  harness: ReturnType<typeof createOrgTestHarness>,
  name: string,
  slug: string,
) {
  const result = await new CreateOrganizationUseCase(harness).execute({
    name,
    slug,
    actorId: harness.actor("seed"),
    timeZone: "UTC",
  });
  if (!result.isOk()) throw result.error;
  return result.value.organization;
}
