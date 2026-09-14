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
});
