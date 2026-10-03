import {
  DEFAULT_ORGANIZATION_LOGO,
  parseOrganizationLogo,
  parseOrganizationSlug,
  type Organization,
} from "@futrob/organizations";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryOrganizationRepository } from "./in-memory.repository.ts";

const organizationId = asOrganizationId("org-1");

function organization(overrides: Partial<Organization> = {}): Organization {
  const slug = parseOrganizationSlug("liga-norte");
  if (!slug) throw new Error("fixture slug must be valid");
  return {
    id: organizationId,
    name: "Liga Norte",
    normalizedName: "liga norte",
    slug,
    timeZone: "UTC",
    logo: DEFAULT_ORGANIZATION_LOGO,
    createdAt: new Date(0),
    createdByActorId: asActorId("actor-1"),
    ...overrides,
  };
}

async function seeded() {
  const repository = new InMemoryOrganizationRepository();
  await repository.create(organization());
  return repository;
}

describe("InMemoryOrganizationRepository.update", () => {
  it("keeps both changes when a time zone and a logo are written concurrently", async () => {
    const repository = await seeded();
    const logo = parseOrganizationLogo(
      { kind: "upload", key: "organization-logos/org-1/crest-1.png" },
      organizationId,
    );
    if (!logo) throw new Error("fixture logo must be valid");

    await Promise.all([
      repository.update(organizationId, { timeZone: "America/Lima" }),
      repository.update(organizationId, { logo }),
    ]);

    expect(await repository.getById(organizationId)).toMatchObject({
      timeZone: "America/Lima",
      logo,
    });
  });

  it("keeps both changes when a rename and a time zone are written concurrently", async () => {
    const repository = await seeded();

    await Promise.all([
      repository.update(organizationId, {
        name: "Liga del Norte",
        normalizedName: "liga del norte",
      }),
      repository.update(organizationId, { timeZone: "Europe/Madrid" }),
    ]);

    expect(await repository.getById(organizationId)).toMatchObject({
      name: "Liga del Norte",
      timeZone: "Europe/Madrid",
    });
  });

  it("leaves fields that were not sent as they are", async () => {
    const repository = await seeded();

    const updated = await repository.update(organizationId, { timeZone: "America/Bogota" });

    expect(updated).toMatchObject({
      name: "Liga Norte",
      slug: "liga-norte",
      timeZone: "America/Bogota",
      logo: { kind: "monogram" },
    });
  });

  it("lets only one of two concurrent claims on the same slug win", async () => {
    const repository = await seeded();
    const otherId = asOrganizationId("org-2");
    const otherSlug = parseOrganizationSlug("liga-sur");
    const shared = parseOrganizationSlug("norte-fc");
    if (!otherSlug || !shared) throw new Error("fixture slugs must be valid");
    await repository.create(
      organization({ id: otherId, name: "Liga Sur", normalizedName: "liga sur", slug: otherSlug }),
    );

    const results = await Promise.all([
      repository.update(organizationId, { slug: shared }),
      repository.update(otherId, { slug: shared }),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    const owners = [await repository.getById(organizationId), await repository.getById(otherId)];
    expect(owners.filter((row) => row?.slug === shared)).toHaveLength(1);
  });

  it("answers null for an organization that does not exist", async () => {
    const repository = await seeded();

    expect(
      await repository.update(asOrganizationId("missing"), { timeZone: "America/Lima" }),
    ).toBeNull();
  });
});
