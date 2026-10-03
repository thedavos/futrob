import { describe, expect, it } from "vite-plus/test";
import { futrobOpenApiV1 } from "./document.ts";
import { rankingKindSchema } from "../statistics/schemas.ts";

describe("team performance OpenAPI", () => {
  it("exposes an authenticated resource without extending player kinds or standings", () => {
    const operation =
      futrobOpenApiV1.paths[
        "/organizations/{organizationId}/competitions/{competitionId}/team-performance-ranking"
      ].get;
    expect(operation.operationId).toBe("getTeamPerformanceRanking");
    expect(operation.responses["403"]).toEqual({ $ref: "#/components/responses/ApiError" });
    expect(futrobOpenApiV1.components.schemas.TeamPerformanceRankingSnapshot).toMatchObject({
      properties: {
        formulaVersion: { const: "team-performance-v1" },
        normalizationVersion: { const: "team-performance-normalization-v1" },
      },
    });
    expect(rankingKindSchema.options).toEqual([
      "scorer",
      "assister",
      "rating",
      "mvp",
      "goalkeeper",
    ]);
    expect(
      futrobOpenApiV1.paths[
        "/organizations/{organizationId}/competitions/{competitionId}/standings"
      ].get.operationId,
    ).toBe("getCompetitionStandings");
  });
});
