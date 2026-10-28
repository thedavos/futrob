import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

describe("createFutrobClient results", () => {
  it("lists encounter candidates through the shared response contract", async () => {
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        expect(requestUrl(input)).toBe(
          "https://api.example.com/api/v1/encounters/encounter-1/candidates",
        );
        expect(init?.method).toBe("GET");
        return Response.json({
          status: "ready",
          window: {
            from: "2026-09-14T02:00:00.000Z",
            to: "2026-09-15T14:00:00.000Z",
          },
          candidates: [],
        });
      }),
    });

    await expect(client.results.listEncounterCandidates("encounter-1")).resolves.toEqual({
      status: "ready",
      window: {
        from: "2026-09-14T02:00:00.000Z",
        to: "2026-09-15T14:00:00.000Z",
      },
      candidates: [],
    });
  });

  it("preserves non-ready candidate states", async () => {
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json({ status: "clubs_not_connected", sides: ["away"] }),
      ),
    });

    await expect(client.results.listEncounterCandidates("encounter-2")).resolves.toEqual({
      status: "clubs_not_connected",
      sides: ["away"],
    });
  });

  it("lists a competition's dispute queue through the shared response contract", async () => {
    const queue = {
      competition: { id: "comp/1", name: "Copa", timeZone: "America/Lima" },
      disputes: [
        {
          encounterId: "enc-1",
          status: "disputed",
          home: { teamId: "team-home", name: "Home" },
          away: { teamId: "team-away", name: null },
          scheduledStartAt: "2026-09-14T20:00:00.000Z",
          since: "2026-09-14T22:00:00.000Z",
          dispute: {
            id: "dispute-1",
            status: "open",
            openedByTeamId: "team-away",
            openedAt: "2026-09-14T22:00:00.000Z",
            reviewStartedAt: null,
          },
        },
      ],
    };
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        expect(requestUrl(input)).toBe(
          "https://api.example.com/api/v1/organizations/org-1/competitions/comp%2F1/disputes",
        );
        expect(init?.method).toBe("GET");
        return Response.json(queue);
      }),
    });

    await expect(client.results.listCompetitionDisputes("org-1", "comp/1")).resolves.toEqual(queue);
  });

  it("rejects a queue entry outside the dispute statuses", async () => {
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json({
          competition: { id: "comp-1", name: "Copa", timeZone: "America/Lima" },
          disputes: [
            {
              encounterId: "enc-1",
              status: "approved",
              home: { teamId: "team-home", name: "Home" },
              away: { teamId: "team-away", name: "Away" },
              scheduledStartAt: "2026-09-14T20:00:00.000Z",
              since: "2026-09-14T22:00:00.000Z",
              dispute: null,
            },
          ],
        }),
      ),
    });

    await expect(client.results.listCompetitionDisputes("org-1", "comp-1")).rejects.toThrow();
  });
});
