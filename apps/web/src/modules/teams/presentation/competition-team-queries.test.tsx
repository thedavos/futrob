// @vitest-environment jsdom

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { CompetitionTeamManagementDetailResponse } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  useCompetitionTeamClubNamesQuery,
  useChangeRosterRoleMutation,
  useCompetitionTeamManagementQuery,
  useSetRosterOpenMutation,
} from "./competition-team-queries.ts";
import { teamsBrowserClient } from "./teams-browser-client.ts";
import { teamManagementFixture, teamSummaryFixture } from "./competition-teams-view.fixtures.ts";

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

  it("walks every cursor page into a club-name map", async () => {
    const first = teamSummaryFixture();
    const second = teamSummaryFixture();
    vi.spyOn(teamsBrowserClient, "listCompetitionManagement")
      .mockResolvedValueOnce({
        items: [{ ...first, team: { ...first.team, id: "team-1" } }],
        nextCursor: "team-25",
      })
      .mockResolvedValueOnce({
        items: [
          {
            ...second,
            team: { ...second.team, id: "team-2" },
            externalClub: second.externalClub
              ? { ...second.externalClub, externalClubName: "Tigres" }
              : null,
          },
        ],
        nextCursor: null,
      });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useCompetitionTeamClubNamesQuery("org-1", "competition-1"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ "team-1": "Cuervos EA", "team-2": "Tigres" });
  });
});

const scope = { organizationId: "org-1", competitionId: "competition-1", teamId: "team-1" };
const listKey = queryKeys.teams.competitionManagement("org-1", "competition-1");
const detailKey = queryKeys.teams.competitionManagementDetail("org-1", "competition-1", "team-1");
const otherListKey = queryKeys.teams.competitionManagement("org-1", "competition-2");

function seededClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  const otherTeam = teamSummaryFixture();
  const list = {
    pageParams: [undefined],
    pages: [
      {
        items: [teamSummaryFixture(), { ...otherTeam, team: { ...otherTeam.team, id: "team-2" } }],
        nextCursor: null,
      },
    ],
  };
  queryClient.setQueryData(listKey, list);
  queryClient.setQueryData(otherListKey, list);
  queryClient.setQueryData(detailKey, teamManagementFixture());
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function rosterStates(queryClient: QueryClient, key: readonly unknown[]) {
  const list =
    queryClient.getQueryData<
      InfiniteData<Awaited<ReturnType<typeof teamsBrowserClient.listCompetitionManagement>>>
    >(key);
  return list?.pages.flatMap((page) => page.items.map((item) => [item.team.id, item.roster.state]));
}

function roles(queryClient: QueryClient) {
  return queryClient
    .getQueryData<CompetitionTeamManagementDetailResponse>(detailKey)
    ?.members.map((member) => [member.membership.id, member.membership.role]);
}

describe("closing a competition Team roster", () => {
  it("shows the roster closed in the detail and its list row before the server answers", async () => {
    vi.spyOn(teamsBrowserClient, "closeRoster").mockReturnValue(new Promise(() => undefined));
    const { queryClient, wrapper } = seededClient();
    const { result } = renderHook(() => useSetRosterOpenMutation(scope), { wrapper });

    act(() => result.current.mutate(false));

    await waitFor(() =>
      expect(
        queryClient.getQueryData<CompetitionTeamManagementDetailResponse>(detailKey)?.roster.state,
      ).toBe("closed"),
    );
    expect(
      queryClient.getQueryData<CompetitionTeamManagementDetailResponse>(detailKey)?.roster.lockedAt,
    ).toEqual(expect.any(String));
    expect(rosterStates(queryClient, listKey)).toEqual([
      ["team-1", "closed"],
      ["team-2", "open"],
    ]);
    expect(rosterStates(queryClient, otherListKey)).toEqual([
      ["team-1", "open"],
      ["team-2", "open"],
    ]);
  });

  it("shows the roster open again when closing fails", async () => {
    vi.spyOn(teamsBrowserClient, "closeRoster").mockRejectedValue(new Error("network"));
    vi.spyOn(teamsBrowserClient, "listCompetitionManagement").mockReturnValue(
      new Promise(() => undefined),
    );
    vi.spyOn(teamsBrowserClient, "getCompetitionTeamManagement").mockReturnValue(
      new Promise(() => undefined),
    );
    const { queryClient, wrapper } = seededClient();
    const { result } = renderHook(() => useSetRosterOpenMutation(scope), { wrapper });

    await act(() => result.current.mutateAsync(false).catch(() => undefined));

    expect(
      queryClient.getQueryData<CompetitionTeamManagementDetailResponse>(detailKey)?.roster,
    ).toMatchObject({ state: "open", lockedAt: null });
    expect(rosterStates(queryClient, listKey)).toEqual([
      ["team-1", "open"],
      ["team-2", "open"],
    ]);
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherListKey)?.isInvalidated).toBe(false);
  });
});

describe("changing a roster role", () => {
  it("shows the new captain and demotes the previous one before the server answers", async () => {
    vi.spyOn(teamsBrowserClient, "changeRosterRole").mockReturnValue(new Promise(() => undefined));
    const { queryClient, wrapper } = seededClient();
    const { result } = renderHook(() => useChangeRosterRoleMutation(scope), { wrapper });

    act(() => result.current.mutate({ membershipId: "member-2", role: "captain" }));

    await waitFor(() =>
      expect(roles(queryClient)).toEqual([
        ["member-1", "player"],
        ["member-2", "captain"],
      ]),
    );
  });

  it("keeps the captain when another member becomes vice captain", async () => {
    vi.spyOn(teamsBrowserClient, "changeRosterRole").mockReturnValue(new Promise(() => undefined));
    const { queryClient, wrapper } = seededClient();
    const { result } = renderHook(() => useChangeRosterRoleMutation(scope), { wrapper });

    act(() => result.current.mutate({ membershipId: "member-2", role: "vice_captain" }));

    await waitFor(() =>
      expect(roles(queryClient)).toEqual([
        ["member-1", "captain"],
        ["member-2", "vice_captain"],
      ]),
    );
  });

  it("restores the previous roles when the change fails", async () => {
    vi.spyOn(teamsBrowserClient, "changeRosterRole").mockRejectedValue(new Error("forbidden"));
    vi.spyOn(teamsBrowserClient, "getCompetitionTeamManagement").mockReturnValue(
      new Promise(() => undefined),
    );
    const { queryClient, wrapper } = seededClient();
    const { result } = renderHook(() => useChangeRosterRoleMutation(scope), { wrapper });

    await act(() =>
      result.current
        .mutateAsync({ membershipId: "member-2", role: "captain" })
        .catch(() => undefined),
    );

    expect(roles(queryClient)).toEqual([
      ["member-1", "captain"],
      ["member-2", "player"],
    ]);
  });
});
