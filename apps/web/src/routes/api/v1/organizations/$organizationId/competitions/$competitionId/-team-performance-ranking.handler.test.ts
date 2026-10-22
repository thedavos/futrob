import { describe, expect, it } from "vite-plus/test";
import type { GetTeamPerformanceRankingResponse } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { teamPerformanceRankingFixture } from "@/modules/statistics/presentation/team-performance/team-performance.fixtures.ts";
import { handleGetTeamPerformanceRankingRequest } from "./-team-performance-ranking.handler.ts";

const scope = { organizationId: "org-1", competitionId: "competition-1" };

describe("team performance ranking BFF", () => {
  it("forwards the route scope and returns the parsed ranking unchanged", async () => {
    const calls: unknown[] = [];
    const body: GetTeamPerformanceRankingResponse = { ranking: teamPerformanceRankingFixture() };
    const response = await handleGetTeamPerformanceRankingRequest(scope, {
      load: async (input) => {
        calls.push(input);
        return body;
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
    expect(calls).toEqual([scope]);
  });

  it("keeps a ranking that has not been built yet as null", async () => {
    const response = await handleGetTeamPerformanceRankingRequest(scope, {
      load: async () => ({ ranking: null }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ranking: null });
  });

  it("preserves the product API refusal instead of hiding it as an empty ranking", async () => {
    const response = await handleGetTeamPerformanceRankingRequest(scope, {
      load: async () => {
        throw new FutrobApiError({
          status: 403,
          body: {
            code: "statistics.read_forbidden",
            messageKey: "errors.statistics.read_forbidden",
          },
        });
      },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "statistics.read_forbidden" });
  });

  it("rejects malformed wire data before it reaches the browser", async () => {
    const ranking = teamPerformanceRankingFixture();
    const invalid = {
      ranking: { ...ranking, rows: [{ ...ranking.rows[0], score: 140 }] },
    };
    const response = await handleGetTeamPerformanceRankingRequest(scope, {
      // SAFETY: Deliberately bypass the typed client to prove the BFF rejects malformed wire data.
      load: async () => invalid as GetTeamPerformanceRankingResponse,
    });

    expect(response.status).toBe(500);
  });
});
