import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { statisticsBrowserClient } from "./statistics-browser-client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("statisticsBrowserClient", () => {
  it("encodes and validates a personal provider match detail request", async () => {
    let requestedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        requestedUrl =
          input instanceof Request ? input.url : input instanceof URL ? input.href : input;
        return Response.json({ status: "not_found" });
      }),
    );

    await expect(
      statisticsBrowserClient.getMyRecentMatch({
        providerKey: "ea-clubs",
        externalMatchId: "match/with spaces",
        externalClubId: "club/10754",
      }),
    ).resolves.toEqual({ status: "not_found" });
    expect(requestedUrl).toBe(
      "/api/v1/players/me/recent-matches/ea-clubs/match%2Fwith%20spaces?externalClubId=club%2F10754",
    );
  });
});
