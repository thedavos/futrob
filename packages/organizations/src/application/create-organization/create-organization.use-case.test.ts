import { describe, expect, it } from "vite-plus/test";
import { CreateOrganizationUseCase } from "./create-organization.use-case.ts";
import { createOrgTestHarness } from "../test-harness.ts";

describe("CreateOrganizationUseCase", () => {
  it("creates an organization and organizer membership", async () => {
    const harness = createOrgTestHarness();
    const useCase = new CreateOrganizationUseCase(harness);
    const actorId = harness.actor("actor-1");

    const result = await useCase.execute({ name: "  Liga Norte  ", actorId });

    expect(result.ok).toBe(true);
    if (!result.ok) {
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

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("organizations.invalid_name");
  });
});
