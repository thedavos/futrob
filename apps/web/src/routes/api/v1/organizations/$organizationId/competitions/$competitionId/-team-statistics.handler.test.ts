import { describe, expect, it } from "vite-plus/test";
import type { GetCompetitionTeamStatisticsResponse } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { handleGetCompetitionTeamStatisticsRequest } from "./-team-statistics.handler.ts";

const metrics = {
  goals: 4,
  assists: 3,
  shots: 12,
  passAttempts: 120,
  passesMade: 98,
  tackleAttempts: 30,
  tacklesMade: 21,
  saves: 5,
  yellowCards: 1,
  redCards: 0,
  mvpAwards: 1,
  rating: 15.2,
};

const response: GetCompetitionTeamStatisticsResponse = {
  teams: [
    {
      teamId: "team-1",
      competitionId: "competition-1",
      organizationId: "org-1",
      matchesPlayed: 2,
      minutes: 180,
      totals: metrics,
      averages: { ...metrics, goals: 2, rating: 7.6 },
      per90: { ...metrics, goals: 2, rating: null },
      partial: {
        goals: false,
        assists: false,
        shots: true,
        passAttempts: false,
        passesMade: false,
        tackleAttempts: false,
        tacklesMade: false,
        saves: false,
        yellowCards: false,
        redCards: false,
        mvpAwards: false,
        rating: false,
        minutes: false,
      },
      sourceRevisionMax: 3,
      updatedAt: "2026-10-20T12:00:00.000Z",
    },
  ],
};

describe("competition team statistics BFF", () => {
  it("forwards the organization and competition scope and returns the parsed DTO", async () => {
    const calls: unknown[] = [];
    const result = await handleGetCompetitionTeamStatisticsRequest(
      { organizationId: "org-1", competitionId: "competition-1" },
      {
        load: async (scope) => {
          calls.push(scope);
          return response;
        },
      },
    );

    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(response);
    expect(calls).toEqual([{ organizationId: "org-1", competitionId: "competition-1" }]);
  });

  it("keeps the product API refusal instead of turning it into an empty list", async () => {
    const result = await handleGetCompetitionTeamStatisticsRequest(
      { organizationId: "org-1", competitionId: "competition-1" },
      {
        load: async () => {
          throw new FutrobApiError({
            status: 403,
            body: {
              code: "statistics.read_forbidden",
              messageKey: "errors.statistics.read_forbidden",
            },
          });
        },
      },
    );

    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ code: "statistics.read_forbidden" });
  });

  it("rejects malformed product API data", async () => {
    const invalid = { teams: [{ teamId: "team-1" }] };
    const result = await handleGetCompetitionTeamStatisticsRequest(
      { organizationId: "org-1", competitionId: "competition-1" },
      {
        // SAFETY: Deliberately bypass the typed client to prove the BFF rejects malformed wire data.
        load: async () => invalid as unknown as GetCompetitionTeamStatisticsResponse,
      },
    );

    expect(result.status).toBe(500);
  });
});
