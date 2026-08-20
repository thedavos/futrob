import type { GetMyRecentMatchResponse } from "@futrob/api-contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  recentProviderMatchDetailFixture,
  recentProviderMatchFixture,
} from "./player-matches-page.fixtures.ts";
import { toProviderMatchDetailViewState } from "./provider-match-detail-query.tsx";

describe("toProviderMatchDetailViewState", () => {
  it("uses a list summary only for the loading header", () => {
    const listSummary = recentProviderMatchFixture();

    expect(
      toProviderMatchDetailViewState({
        data: undefined,
        isError: false,
        isPending: true,
        listSummary,
        retry: vi.fn<() => void>(),
      }),
    ).toEqual({ kind: "loading", summary: listSummary });
  });

  it.each([
    [{ status: "needs_club" } as const, { kind: "needs_club" }],
    [{ status: "needs_game_account" } as const, { kind: "needs_game_account" }],
    [{ status: "not_found" } as const, { kind: "not_found" }],
  ])("maps the %s response", (data, expected) => {
    expect(
      toProviderMatchDetailViewState({
        data,
        isError: false,
        isPending: false,
        listSummary: undefined,
        retry: vi.fn<() => void>(),
      }),
    ).toEqual(expected);
  });

  it("maps a provider failure to a retryable error", () => {
    const retry = vi.fn<() => void>();
    expect(
      toProviderMatchDetailViewState({
        data: undefined,
        isError: true,
        isPending: false,
        listSummary: undefined,
        retry,
      }),
    ).toEqual({ kind: "error", retry });
  });

  it("does not treat a ready detail response as a list summary", () => {
    const data: GetMyRecentMatchResponse = {
      status: "ready",
      match: recentProviderMatchDetailFixture(),
    };
    expect(
      toProviderMatchDetailViewState({
        data,
        isError: false,
        isPending: false,
        listSummary: recentProviderMatchFixture(),
        retry: vi.fn<() => void>(),
      }),
    ).toEqual({ kind: "ready", detail: data.match });
  });
});
