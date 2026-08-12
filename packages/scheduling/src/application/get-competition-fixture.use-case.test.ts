import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { GetCompetitionFixtureUseCase } from "./get-competition-fixture.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");

function authorization(allowed: boolean): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

describe("GetCompetitionFixtureUseCase", () => {
  it("does not query fixture persistence for an unauthorized actor", async () => {
    let reads = 0;
    const result = await new GetCompetitionFixtureUseCase({
      authorization: authorization(false),
      fixtures: {
        findById: async () => {
          reads += 1;
          return null;
        },
      },
    }).execute({
      actorId: asActorId("outsider-1"),
      organizationId,
      competitionId,
      fixturePlanId: "fixture-1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_plan_not_found");
    expect(reads).toBe(0);
  });
});
