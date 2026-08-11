// @vitest-environment jsdom

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { useSetRosterOpenMutation } from "./competition-team-queries.ts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

afterEach(() => {
  vi.restoreAllMocks();
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
