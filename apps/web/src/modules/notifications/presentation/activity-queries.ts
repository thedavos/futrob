import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";
import type { ListActivitiesResponse } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { activityBrowserClient } from "./activity-browser-client.ts";
import {
  ACTIVITY_FEED_PAGE_SIZE,
  RECENT_ACTIVITY_LIMIT,
  PENDING_ACTIVITY_LIMIT,
  type PendingActivitySource,
  type ActivityFeedSource,
} from "./activity-sources.ts";

function feedKey(source: ActivityFeedSource) {
  return source.kind === "organization"
    ? queryKeys.activities.organizationFeed(source.organizationId)
    : queryKeys.activities.mineFeed();
}

export function useRecentActivityQuery(source: ActivityFeedSource) {
  const query = { limit: RECENT_ACTIVITY_LIMIT };
  return useQuery({
    queryKey:
      source.kind === "organization"
        ? queryKeys.activities.organization(source.organizationId, query)
        : queryKeys.activities.mine(query),
    queryFn: () =>
      source.kind === "organization"
        ? activityBrowserClient.listForOrganization(source.organizationId, query)
        : activityBrowserClient.listMine(query),
    retry: false,
  });
}

export function useActivityFeedQuery(source: ActivityFeedSource) {
  return useInfiniteQuery<
    ListActivitiesResponse,
    Error,
    InfiniteData<ListActivitiesResponse>,
    ReturnType<typeof feedKey>,
    string | undefined
  >({
    queryKey: feedKey(source),
    queryFn: ({ pageParam }) => {
      const query = { limit: ACTIVITY_FEED_PAGE_SIZE, cursor: pageParam };
      return source.kind === "organization"
        ? activityBrowserClient.listForOrganization(source.organizationId, query)
        : activityBrowserClient.listMine(query);
    },
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
}

/**
 * Open rows that need the viewer to act, for the sidebar of the active space. The space is
 * sent to the server so it narrows the rows before the page limit, never after.
 */
export function usePendingActivitiesQuery(source: PendingActivitySource) {
  const pending = { status: "open", requiresAction: true, limit: PENDING_ACTIVITY_LIMIT } as const;
  const scope = { competitionId: source.competitionId };
  return useQuery({
    queryKey:
      source.kind === "organization"
        ? queryKeys.activities.organization(source.organizationId, { ...pending, ...scope })
        : queryKeys.activities.mine({
            ...pending,
            ...scope,
            organizationId: source.organizationId,
          }),
    queryFn: () =>
      source.kind === "organization"
        ? activityBrowserClient.listForOrganization(source.organizationId, {
            ...pending,
            ...scope,
          })
        : activityBrowserClient.listMine({
            ...pending,
            ...scope,
            organizationId: source.organizationId,
          }),
    staleTime: 30_000,
  });
}
