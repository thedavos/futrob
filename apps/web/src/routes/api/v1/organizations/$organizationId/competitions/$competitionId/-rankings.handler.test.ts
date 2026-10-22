import { describe, expect, it } from "vite-plus/test";
import type { GetCompetitionRankingsResponse } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { handleGetCompetitionRankingsRequest } from "./-rankings.handler.ts";

const URL_BASE =
  "https://app.futrob.test/api/v1/organizations/org-1/competitions/competition-1/rankings";

const rankings: GetCompetitionRankingsResponse = {
  rankings: [
    {
      competitionId: "competition-1",
      organizationId: "org-1",
      kind: "scorer",
      formulaVersion: "player-ranking-v1",
      eligibility: { minimumMatches: 3, minimumTeamMinutesRatio: 0.6 },
      rows: [
        {
          position: 1,
          playerProfileId: "profile-1",
          teamId: "team-1",
          value: 7,
          matchesPlayed: 4,
          minutes: 360,
        },
      ],
      sourceRevisionMax: 3,
      updatedAt: "2026-10-20T12:00:00.000Z",
    },
  ],
};

describe("competition rankings BFF", () => {
  it("forwards every kind when none is requested and returns the parsed rankings", async () => {
    const calls: unknown[] = [];
    const response = await handleGetCompetitionRankingsRequest(new Request(URL_BASE), {
      load: async (query) => {
        calls.push(query);
        return rankings;
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(rankings);
    expect(calls).toEqual([{}]);
  });

  it("forwards a supported kind", async () => {
    const calls: unknown[] = [];
    await handleGetCompetitionRankingsRequest(new Request(`${URL_BASE}?kind=goalkeeper`), {
      load: async (query) => {
        calls.push(query);
        return { rankings: [] };
      },
    });

    expect(calls).toEqual([{ kind: "goalkeeper" }]);
  });

  it("rejects an unknown kind without calling the product API", async () => {
    let calls = 0;
    const response = await handleGetCompetitionRankingsRequest(
      new Request(`${URL_BASE}?kind=team-performance`),
      {
        load: async () => {
          calls += 1;
          return { rankings: [] };
        },
      },
    );

    expect(response.status).toBe(400);
    expect(calls).toBe(0);
  });

  it("keeps the product API refusal instead of turning it into an empty ranking", async () => {
    const response = await handleGetCompetitionRankingsRequest(new Request(URL_BASE), {
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

  it("validates the product API response before returning it", async () => {
    const invalid = { rankings: [{ ...rankings.rankings[0], kind: "team" }] };
    const response = await handleGetCompetitionRankingsRequest(new Request(URL_BASE), {
      // SAFETY: Deliberately bypass the typed client to prove the BFF rejects malformed wire data.
      load: async () => invalid as unknown as GetCompetitionRankingsResponse,
    });

    expect(response.status).toBe(500);
  });
});
