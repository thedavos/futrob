import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  recentProviderMatchDetailFixture,
  recentProviderMatchFixture,
} from "./player-matches-page.fixtures.ts";
import { myRecentMatchQueryOptions, recentMatchListSummary } from "./statistics-queries.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("personal provider match detail query", () => {
  it("reads the list summary without putting it in the detail cache", async () => {
    const row = recentProviderMatchFixture({ externalMatchId: "match-1" });
    const detail = recentProviderMatchDetailFixture({
      externalMatchId: "match-1",
      players: [row.appearance],
    });
    const input = {
      externalClubId: "10754",
      providerKey: "ea-clubs" as const,
      externalMatchId: "match-1",
    };
    let requests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        requests += 1;
        return Response.json({
          status: "ready",
          match: detail,
        });
      }),
    );

    expect(
      recentMatchListSummary(
        { status: "ready", matches: [row] },
        input.providerKey,
        input.externalMatchId,
      ),
    ).toEqual(row);

    const options = myRecentMatchQueryOptions(input);
    expect(options.placeholderData).toBeUndefined();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const defaultedOptions = queryClient.defaultQueryOptions(options);
    const observer = new QueryObserver(queryClient, defaultedOptions);

    const first = observer.getOptimisticResult(defaultedOptions);
    expect(first.isPlaceholderData).toBe(false);
    expect(first.data).toBeUndefined();
    await queryClient.fetchQuery(options);

    expect(requests).toBe(1);
    expect(queryClient.getQueryData(options.queryKey)).toEqual({ status: "ready", match: detail });
  });

  it("reuses fresh detail cache and isolates a selected-club change", async () => {
    const detail = recentProviderMatchDetailFixture({ externalMatchId: "match-1" });
    let requests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        requests += 1;
        return Response.json({ status: "ready", match: detail });
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const first = myRecentMatchQueryOptions({
      externalClubId: "10754",
      providerKey: "ea-clubs",
      externalMatchId: "match-1",
    });
    const otherClub = myRecentMatchQueryOptions({
      externalClubId: "44001",
      providerKey: "ea-clubs",
      externalMatchId: "match-1",
    });

    await queryClient.fetchQuery(first);
    await queryClient.fetchQuery(first);
    await queryClient.fetchQuery(otherClub);

    expect(first.queryKey).toEqual(
      queryKeys.gameData.meRecentMatch({
        externalClubId: "10754",
        providerKey: "ea-clubs",
        externalMatchId: "match-1",
      }),
    );
    expect(requests).toBe(2);
  });
});
