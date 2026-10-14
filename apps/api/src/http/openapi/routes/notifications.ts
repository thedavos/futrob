import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import { ListActivitiesResponse } from "@/http/openapi/components.ts";
import { listActivitiesQuerySchema } from "@futrob/api-contracts";

export const listOrganizationActivitiesRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/activities",
  operationId: "listOrganizationActivities",
  tags: ["notifications"],
  summary: "List the organization's activity feed for its operators",
  description:
    "Requires `encounters.results.approve` on the organization. Lists every kind: disputes to resolve, watched proposals and directed invitations, and publications. Failures: 400 `api.validation_error`, `notifications.invalid_cursor`; 403 `authorization.forbidden`.",
  params: pathParams(["organizationId"]),
  query: listActivitiesQuerySchema.omit({ organizationId: true }),
  success: {
    status: 200,
    description:
      "Newest first by `lastEventAt`. Pending lists ask for `status=open&requiresAction=true`; open rows past `expiresAt` are left out of them. Pass `nextCursor` back as `cursor`.",
    schema: ListActivitiesResponse,
  },
  errors: [400, 401, 403],
});

export const listMyActivitiesRoute = defineRoute({
  method: "get",
  path: "/players/me/activities",
  operationId: "listMyActivities",
  tags: ["notifications"],
  summary: "List the actor's activity and that of the Teams they captain",
  description:
    "Rows addressed to the actor (directed roster invitations) and to every Team the actor represents as captain or vice-captain (proposals to confirm).",
  query: listActivitiesQuerySchema,
  success: {
    status: 200,
    description:
      "Newest first by `lastEventAt`. Pending lists ask for `status=open&requiresAction=true`; open rows past `expiresAt` are left out of them. Pass `nextCursor` back as `cursor`.",
    schema: ListActivitiesResponse,
  },
  errors: [400, 401],
});
