import { describe, expect, it } from "vite-plus/test";
import type { GetMyRecentMatchResponse } from "@futrob/api-contracts";
import { handleGetMyRecentMatchRequest } from "./-detail.handler.ts";

describe("recent provider match detail BFF", () => {
  it("validates and forwards the composite identity and selected club", async () => {
    const calls: unknown[] = [];
    const response = await handleGetMyRecentMatchRequest(
      new Request(
        "https://app.futrob.test/api/v1/players/me/recent-matches/ea-clubs/match-1?externalClubId=%2010754%20",
      ),
      { providerKey: "ea-clubs", externalMatchId: "match-1" },
      {
        load: async (input) => {
          calls.push(input);
          return { status: "not_found" };
        },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "not_found" });
    expect(calls).toEqual([
      {
        providerKey: "ea-clubs",
        externalMatchId: "match-1",
        externalClubId: "10754",
      },
    ]);
  });

  it("rejects invalid route params without calling the product API", async () => {
    let calls = 0;
    const response = await handleGetMyRecentMatchRequest(
      new Request(
        "https://app.futrob.test/api/v1/players/me/recent-matches/unknown/match-1?externalClubId=10754",
      ),
      { providerKey: "unknown", externalMatchId: "match-1" },
      {
        load: async () => {
          calls += 1;
          return { status: "not_found" };
        },
      },
    );

    expect(response.status).toBe(400);
    expect(calls).toBe(0);
  });

  it("validates the product API response before returning it", async () => {
    const invalid = { status: "ready", match: { kind: "played" } };
    await expect(
      handleGetMyRecentMatchRequest(
        new Request("https://app.futrob.test/api/v1/players/me/recent-matches/ea-clubs/match-1"),
        { providerKey: "ea-clubs", externalMatchId: "match-1" },
        {
          // SAFETY: Deliberately bypass the typed client to prove the BFF rejects malformed wire data.
          load: async () => invalid as GetMyRecentMatchResponse,
        },
      ),
    ).resolves.toMatchObject({ status: 500 });
  });
});
