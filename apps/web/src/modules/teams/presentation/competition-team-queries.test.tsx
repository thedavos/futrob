// @vitest-environment jsdom

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  useCompetitionTeamManagementQuery,
  useSetRosterOpenMutation,
} from "./competition-team-queries.ts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("competition Team pagination", () => {
  it("requests and accumulates the next cursor page", async () => {
    const list = vi
      .spyOn(teamsBrowserClient, "listCompetitionManagement")
      .mockResolvedValueOnce({ items: [], nextCursor: "team-25" })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useCompetitionTeamManagementQuery("org-1", "competition-1"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    let fetched: Awaited<ReturnType<typeof result.current.fetchNextPage>> | undefined;
    await act(async () => {
      fetched = await result.current.fetchNextPage();
    });

    expect(list).toHaveBeenNthCalledWith(1, "org-1", "competition-1", {
      cursor: undefined,
      limit: 25,
    });
    expect(list).toHaveBeenNthCalledWith(2, "org-1", "competition-1", {
      cursor: "team-25",
      limit: 25,
    });
    expect(fetched?.data?.pages).toHaveLength(2);
  });
});

describe("competition Team mutation invalidation", () => {
  it("invalidates the selected detail and competition list, not another competition", async () => {
    vi.spyOn(teamsBrowserClient, "closeRoster").mockResolvedValue({
      organizationId: "org-1",
      competitionId: "competition-1",
      teamId: "team-1",
      lockedAt: "2026-08-11T00:00:00.000Z",
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const listKey = queryKeys.teams.competitionManagement("org-1", "competition-1");
    const detailKey = queryKeys.teams.competitionManagementDetail(
      "org-1",
      "competition-1",
      "team-1",
    );
    const otherKey = queryKeys.teams.competitionManagement("org-1", "competition-2");
    queryClient.setQueryData(listKey, { items: [] });
    queryClient.setQueryData(detailKey, { members: [] });
    queryClient.setQueryData(otherKey, { items: [] });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useSetRosterOpenMutation({
          organizationId: "org-1",
          competitionId: "competition-1",
          teamId: "team-1",
        }),
      { wrapper },
    );

    await act(() => result.current.mutateAsync(false));

    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherKey)?.isInvalidated).toBe(false);
  });
});
