import { asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import {
  OrganizationForbidden,
  OrganizationNotFound,
} from "../../domain/errors/invitation.errors.ts";
import { InvalidOrganizationLogo } from "../../domain/errors/organization.errors.ts";
import { CreateOrganizationUseCase } from "../create-organization/create-organization.use-case.ts";
import { GetOrganizationProfileUseCase } from "../get-organization-profile/get-organization-profile.use-case.ts";
import { createOrgTestHarness } from "../test-harness.ts";
import { SetOrganizationLogoUseCase } from "./set-organization-logo.use-case.ts";

async function setup() {
  const harness = createOrgTestHarness();
  const organizer = harness.actor("organizer");
  const created = await new CreateOrganizationUseCase(harness).execute({
    name: "Liga Norte",
    actorId: organizer,
    timeZone: "UTC",
  });
  if (!created.isOk()) throw created.error;
  return {
    harness,
    setLogo: new SetOrganizationLogoUseCase(harness),
    getProfile: new GetOrganizationProfileUseCase(harness),
    organizationId: created.value.organization.id,
    organizer,
  };
}

describe("SetOrganizationLogoUseCase", () => {
  it("registers an upload under the organization's prefix and the profile shows it", async () => {
    const { setLogo, getProfile, organizationId, organizer } = await setup();
    const key = `organization-logos/${organizationId}/crest-1.png`;

    const result = await setLogo.execute({
      organizationId,
      actorId: organizer,
      logo: { kind: "upload", key },
    });

    expect(result.isOk() && result.value.logo).toEqual({ kind: "upload", key });
    const profile = await getProfile.execute({ organizationId, actorId: organizer });
    expect(profile.isOk() && profile.value.logo).toEqual({ kind: "upload", key });
  });

  it("goes back to the monogram", async () => {
    const { setLogo, organizationId, organizer } = await setup();
    await setLogo.execute({
      organizationId,
      actorId: organizer,
      logo: { kind: "upload", key: `organization-logos/${organizationId}/crest-1.png` },
    });

    const result = await setLogo.execute({
      organizationId,
      actorId: organizer,
      logo: { kind: "monogram" },
    });

    expect(result.isOk() && result.value.logo).toEqual({ kind: "monogram" });
  });

  it("rejects a key that belongs to another organization and keeps the current logo", async () => {
    const { harness, setLogo, organizationId, organizer } = await setup();

    const result = await setLogo.execute({
      organizationId,
      actorId: organizer,
      logo: { kind: "upload", key: "organization-logos/another-org/crest-1.png" },
    });

    expect(result.isErr() && InvalidOrganizationLogo.is(result.error)).toBe(true);
    expect(await harness.organizations.getById(organizationId)).toMatchObject({
      logo: { kind: "monogram" },
    });
  });

  it("forbids actors without organizations.update", async () => {
    const { harness, setLogo, organizationId } = await setup();
    await harness.memberships.add({
      organizationId,
      actorId: harness.actor("staff"),
      role: "staff",
      createdAt: new Date(),
    });

    const result = await setLogo.execute({
      organizationId,
      actorId: harness.actor("staff"),
      logo: { kind: "upload", key: `organization-logos/${organizationId}/crest-1.png` },
    });

    expect(result.isErr() && OrganizationForbidden.is(result.error)).toBe(true);
    expect(await harness.organizations.getById(organizationId)).toMatchObject({
      logo: { kind: "monogram" },
    });
  });

  it("reports an unknown organization", async () => {
    const { setLogo, organizer } = await setup();

    const result = await setLogo.execute({
      organizationId: asOrganizationId("missing"),
      actorId: organizer,
      logo: { kind: "monogram" },
    });

    expect(result.isErr() && OrganizationNotFound.is(result.error)).toBe(true);
  });
});

describe("GetOrganizationProfileUseCase", () => {
  it("lets any member read the profile and denies outsiders", async () => {
    const { harness, getProfile, organizationId } = await setup();
    await harness.memberships.add({
      organizationId,
      actorId: harness.actor("member"),
      role: "member",
      createdAt: new Date(),
    });

    const asMember = await getProfile.execute({ organizationId, actorId: harness.actor("member") });
    const asOutsider = await getProfile.execute({
      organizationId,
      actorId: harness.actor("outsider"),
    });

    expect(asMember.isOk() && asMember.value).toMatchObject({
      name: "Liga Norte",
      slug: "liga-norte",
      timeZone: "UTC",
    });
    expect(asOutsider.isErr() && OrganizationForbidden.is(asOutsider.error)).toBe(true);
  });
});
