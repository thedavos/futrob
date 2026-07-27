import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { ListMembershipsForActorUseCase } from "./list-memberships-for-actor.use-case.ts";

describe("ListMembershipsForActorUseCase", () => {
  it("returns repository membership summaries for the actor", async () => {
    const actorId = asActorId("actor-1");
    const memberships = [
      {
        organizationId: asOrganizationId("org-1"),
        organizationName: "Liga Futrob",
        role: "staff" as const,
      },
    ];
    const useCase = new ListMembershipsForActorUseCase({
      add: async () => undefined,
      findByActor: async (receivedActorId) => (receivedActorId === actorId ? memberships : []),
      findByOrgAndActor: async () => null,
    });

    await expect(useCase.execute({ actorId })).resolves.toEqual(memberships);
  });
});
