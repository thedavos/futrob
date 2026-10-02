import { describe, expect, it } from "vite-plus/test";
import { createOrgTestHarness } from "../test-harness.ts";
import { CreateOrganizationUseCase } from "../create-organization/create-organization.use-case.ts";
import { CheckOrganizationSlugUseCase } from "./check-organization-slug.use-case.ts";

async function setup() {
  const harness = createOrgTestHarness();
  const created = await new CreateOrganizationUseCase(harness).execute({
    name: "Liga Norte",
    slug: "liga-norte",
    actorId: harness.actor("organizer"),
    timeZone: "UTC",
  });
  if (!created.isOk()) throw created.error;
  return {
    harness,
    check: new CheckOrganizationSlugUseCase(harness.organizations),
    organizationId: created.value.organization.id,
  };
}

describe("CheckOrganizationSlugUseCase", () => {
  it("reports a free, valid slug as available", async () => {
    const { check } = await setup();

    expect(await check.execute({ slug: "liga-sur" })).toEqual({ available: true });
  });

  it("reports a taken slug with the next free variant", async () => {
    const { check } = await setup();

    expect(await check.execute({ slug: "liga-norte" })).toEqual({
      available: false,
      reason: "taken",
      suggestion: "liga-norte-2",
    });
  });

  it("treats the slug the organization already owns as available when editing", async () => {
    const { check, organizationId } = await setup();

    expect(await check.execute({ slug: "liga-norte", organizationId })).toEqual({
      available: true,
    });
  });

  it("does not let another organization's id unlock a taken slug", async () => {
    const { check, harness } = await setup();
    const other = await new CreateOrganizationUseCase(harness).execute({
      name: "Otra",
      actorId: harness.actor("x"),
      timeZone: "UTC",
    });
    if (!other.isOk()) throw other.error;

    const result = await check.execute({
      slug: "liga-norte",
      organizationId: other.value.organization.id,
    });

    expect(result).toMatchObject({ available: false, reason: "taken" });
  });

  it("reports an invalid slug with a normalized suggestion", async () => {
    const { check } = await setup();

    expect(await check.execute({ slug: "Liga Sur!" })).toEqual({
      available: false,
      reason: "invalid",
      suggestion: "liga-sur",
    });
  });

  it("reports a reserved word as invalid and suggests a different one", async () => {
    const { check } = await setup();

    expect(await check.execute({ slug: "admin" })).toEqual({
      available: false,
      reason: "invalid",
      suggestion: "admin-2",
    });
  });
});
