import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { PerformanceRankingNotInPlan } from "../../domain/errors/team-performance.errors.ts";
import { GetTeamPerformanceRankingUseCase } from "./get-team-performance-ranking.use-case.ts";

const scope = {
  actorId: asActorId("organizer"),
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
};

function setup(input: { readonly allowed: boolean; readonly included: boolean }) {
  let reads = 0;
  const useCase = new GetTeamPerformanceRankingUseCase({
    rankings: {
      find: async () => {
        reads++;
        return null;
      },
      replace: async () => {
        throw new PerformanceRankingNotInPlan({
          code: "statistics.performance_ranking_not_in_plan",
          message: "not used",
        });
      },
    },
    authorization: {
      decide: async (request) => ({
        ...request,
        allowed: input.allowed,
        reason: input.allowed ? "allowed" : "no-assignment",
      }),
      getEffectiveAccess: async (request) => ({ ...request, roles: [], permissions: [] }),
    },
    planAccess: { includesPerformanceRanking: async () => input.included },
  });
  return { useCase, reads: () => reads };
}

describe("GetTeamPerformanceRankingUseCase plan gate", () => {
  it("denies a plan without the ranking before reading it", async () => {
    const { useCase, reads } = setup({ allowed: true, included: false });

    await expect(useCase.execute(scope)).rejects.toMatchObject({
      code: "statistics.performance_ranking_not_in_plan",
    });
    expect(reads()).toBe(0);
  });

  it("checks the capability before the plan", async () => {
    const { useCase } = setup({ allowed: false, included: false });

    await expect(useCase.execute(scope)).rejects.toMatchObject({
      code: "statistics.read_forbidden",
    });
  });

  it("reads the ranking when the plan includes it", async () => {
    const { useCase, reads } = setup({ allowed: true, included: true });

    expect(await useCase.execute(scope)).toBeNull();
    expect(reads()).toBe(1);
  });
});
