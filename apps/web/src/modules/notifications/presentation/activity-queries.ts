import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";
import type { ListActivitiesResponse } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { activityBrowserClient } from "./activity-browser-client.ts";
import {
  ACTIVITY_FEED_PAGE_SIZE,
  ORGANIZATION_RECENT_ACTIVITY_LIMIT,
  PENDING_ACTIVITY_LIMIT,
  type PendingActivitySource,
} from "./activity-sources.ts";

/** Latest activity of every kind for the organization home. */
export function useOrganizationRecentActivityQuery(organizationId: string) {
  const query = { limit: ORGANIZATION_RECENT_ACTIVITY_LIMIT };
  return useQuery({
    queryKey: queryKeys.activities.organization(organizationId, query),
    queryFn: () => activityBrowserClient.listForOrganization(organizationId, query),
    retry: false,
  });
}

/** Full organization feed, newest first, one page per «Load more». */
export function useOrganizationActivityFeedQuery(organizationId: string) {
  return useInfiniteQuery<
    ListActivitiesResponse,
    Error,
    InfiniteData<ListActivitiesResponse>,
    ReturnType<typeof queryKeys.activities.organizationFeed>,
    string | undefined
  >({
    queryKey: queryKeys.activities.organizationFeed(organizationId),
    queryFn: ({ pageParam }) =>
      activityBrowserClient.listForOrganization(organizationId, {
        limit: ACTIVITY_FEED_PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
}

/** Open rows that need the viewer to act, for the sidebar of the active space. */
export function usePendingActivitiesQuery(source: PendingActivitySource) {
  const query = { status: "open", requiresAction: true, limit: PENDING_ACTIVITY_LIMIT } as const;
  return useQuery({
    queryKey:
      source.kind === "organization"
        ? queryKeys.activities.organization(source.organizationId, query)
        : queryKeys.activities.mine(query),
    queryFn: () =>
      source.kind === "organization"
        ? activityBrowserClient.listForOrganization(source.organizationId, query)
        : activityBrowserClient.listMine(query),
    staleTime: 30_000,
  });
}
