import {
  listActivitiesResponseSchema,
  type ActivityStatusDto,
  type ListActivitiesResponse,
  type RequestId,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class ActivityClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "ActivityClientError";
  }
}

/** Omit `status` and `requiresAction` for the full feed; pending lists set both. */
export type ActivityListQuery = {
  readonly status?: ActivityStatusDto;
  readonly requiresAction?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
};

function withQuery(path: string, query: ActivityListQuery): string {
  const search = new URLSearchParams();
  if (query.status) search.set("status", query.status);
  if (query.requiresAction !== undefined) {
    search.set("requiresAction", String(query.requiresAction));
  }
  if (query.limit !== undefined) search.set("limit", String(query.limit));
  if (query.cursor) search.set("cursor", query.cursor);
  const encoded = search.toString();
  return encoded ? `${path}?${encoded}` : path;
}

function requestActivities(path: string): Promise<ListActivitiesResponse> {
  return requestBrowserJson({
    path,
    method: "GET",
    schema: listActivitiesResponseSchema,
    fallbackCode: "notifications.client_error",
    createError: (status, error) =>
      new ActivityClientError(status, error.code, error.requestId, error.retryAfterSeconds),
  });
}

export const activityBrowserClient = {
  listForOrganization(
    organizationId: string,
    query: ActivityListQuery = {},
  ): Promise<ListActivitiesResponse> {
    return requestActivities(
      withQuery(`/api/v1/organizations/${encodeURIComponent(organizationId)}/activities`, query),
    );
  },
  listMine(query: ActivityListQuery = {}): Promise<ListActivitiesResponse> {
    return requestActivities(withQuery("/api/v1/players/me/activities", query));
  },
};
