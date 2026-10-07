import {
  listActivitiesResponseSchema,
  type ActivityStatusDto,
  type ListActivitiesResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Omit `status` and `requiresAction` for the full feed; pending lists set both. */
export interface ListActivitiesInput {
  readonly status?: ActivityStatusDto;
  readonly requiresAction?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
}

function withQuery(path: string, input: ListActivitiesInput): string {
  const search = new URLSearchParams();
  if (input.status) search.set("status", input.status);
  if (input.requiresAction !== undefined) {
    search.set("requiresAction", String(input.requiresAction));
  }
  if (input.limit !== undefined) search.set("limit", String(input.limit));
  if (input.cursor) search.set("cursor", input.cursor);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function createActivitiesResource(http: HttpClient) {
  return {
    /** Organization feed for its operators: every kind, newest first. */
    async listForOrganization(
      organizationId: string,
      input: ListActivitiesInput = {},
      options: RequestOptions = {},
    ): Promise<ListActivitiesResponse> {
      return http.request({
        path: withQuery(apiPath("organizations", organizationId, "activities"), input),
        method: "GET",
        options,
        parse: (data) => listActivitiesResponseSchema.parse(data),
      });
    },
    /** The actor's rows and those of the Teams they captain or vice-captain. */
    async listMine(
      input: ListActivitiesInput = {},
      options: RequestOptions = {},
    ): Promise<ListActivitiesResponse> {
      return http.request({
        path: withQuery(apiPath("players", "me", "activities"), input),
        method: "GET",
        options,
        parse: (data) => listActivitiesResponseSchema.parse(data),
      });
    },
  };
}

export type ActivitiesResource = ReturnType<typeof createActivitiesResource>;
