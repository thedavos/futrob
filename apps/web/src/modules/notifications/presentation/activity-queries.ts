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
