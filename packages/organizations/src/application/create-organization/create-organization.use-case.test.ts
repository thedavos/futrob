import { describe, expect, it } from "vite-plus/test";
import {
  InvalidOrganizationName,
  OrganizationNameConflict,
} from "../../domain/errors/organization.errors.ts";
import { CreateOrganizationUseCase } from "./create-organization.use-case.ts";
import { createOrgTestHarness } from "../test-harness.ts";

describe("CreateOrganizationUseCase", () => {
  it("creates an organization and organizer membership", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    const actorId = harness.actor("actor-1");

    const result = await useCase.execute({ name: "  Liga Norte  ", actorId });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) {
      return;
    }

    expect(result.value.organization.name).toBe("Liga Norte");
    expect(result.value.role).toBe("organizer");

    const memberships = await harness.memberships.findByActor(actorId);
    expect(memberships).toEqual([
      {
        organizationId: result.value.organization.id,
        organizationName: "Liga Norte",
        role: "organizer",
      },
    ]);
  });

  it("rejects an empty name", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);

    const result = await useCase.execute({ name: "   ", actorId: harness.actor("a") });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && InvalidOrganizationName.is(result.error)).toBe(true);
  });

  it("returns the same organization when an onboarding creation is retried", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    const input = {
      name: "Liga Norte",
      actorId: harness.actor("actor-1"),
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
    });
    const duplicate = await useCase.execute({
      name: "  LIGA NORTE  ",
      actorId: harness.actor("actor-2"),
    });

    expect(first.isOk()).toBe(true);
    expect(duplicate.isOk()).toBe(false);
    expect(!duplicate.isOk() && OrganizationNameConflict.is(duplicate.error)).toBe(true);
    expect(harness.organizations.byId.size).toBe(1);
    expect(harness.memberships.rows).toHaveLength(1);
  });
});
