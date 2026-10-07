import { z } from "zod";
import { ACTIVITY_PAGE_LIMIT, listActivitiesResponseSchema } from "../notifications/schemas.ts";

// Factories, not shared constants: a shared object would become a YAML anchor that
// renumbers every other anchor in the generated document.
const queryParameters = () => [
  {
    name: "status",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["open", "closed"] },
  },
  {
    name: "requiresAction",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["true", "false"] },
  },
  {
    name: "limit",
    in: "query",
    required: false,
    schema: {
      type: "integer",
      minimum: 1,
      maximum: ACTIVITY_PAGE_LIMIT.max,
      default: ACTIVITY_PAGE_LIMIT.default,
    },
  },
  { name: "cursor", in: "query", required: false, schema: { type: "string" } },
];

const listResponses = () => ({
  "200": {
    description:
      "Newest first by `lastEventAt`. Pending lists ask for `status=open&requiresAction=true`; " +
      "open rows past `expiresAt` are left out of them. Pass `nextCursor` back as `cursor`.",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/ListActivitiesResponse" } },
    },
  },
  "400": { $ref: "#/components/responses/ApiError" },
  "401": { $ref: "#/components/responses/ApiError" },
});

export const activityOpenApiPaths = {
  "/organizations/{organizationId}/activities": {
    get: {
      operationId: "listOrganizationActivities",
      tags: ["notifications"],
      summary: "List the organization's activity feed for its operators",
      description:
        "Requires `encounters.results.approve` on the organization. Lists every kind: disputes " +
        "to resolve, watched proposals and directed invitations, and publications. Failures: " +
        "400 `api.validation_error`, `notifications.invalid_cursor`; 403 `authorization.forbidden`.",
      parameters: [
        { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
        ...queryParameters(),
      ],
      responses: { ...listResponses(), "403": { $ref: "#/components/responses/ApiError" } },
    },
  },
  "/players/me/activities": {
    get: {
      operationId: "listMyActivities",
      tags: ["notifications"],
      summary: "List the actor's activity and that of the Teams they captain",
      description:
        "Rows addressed to the actor (directed roster invitations) and to every Team the actor " +
        "represents as captain or vice-captain (proposals to confirm).",
      parameters: queryParameters(),
      responses: listResponses(),
    },
  },
} as const;

export const activityOpenApiSchemas = {
  ListActivitiesResponse: z.toJSONSchema(listActivitiesResponseSchema, {
    target: "draft-2020-12",
    io: "output",
  }),
};
