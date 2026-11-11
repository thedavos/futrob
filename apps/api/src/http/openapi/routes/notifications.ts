import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  EmailPreferences,
  ListActivitiesResponse,
  RunEmailDispatchResponse,
  UnsubscribeEmailResponse,
} from "@/http/openapi/components.ts";
import {
  listActivitiesQuerySchema,
  saveEmailPreferencesRequestSchema,
  unsubscribeEmailRequestSchema,
} from "@futrob/api-contracts";

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

export const getEmailPreferencesRoute = defineRoute({
  method: "get",
  path: "/notifications/email-preferences",
  operationId: "getEmailPreferences",
  tags: ["notifications"],
  summary: "Get the authenticated actor's email settings",
  description: "An actor who never saved settings gets the defaults: Spanish and every email.",
  success: { status: 200, description: "Current email settings", schema: EmailPreferences },
  errors: [401],
});

export const saveEmailPreferencesRoute = defineRoute({
  method: "put",
  path: "/notifications/email-preferences",
  operationId: "saveEmailPreferences",
  tags: ["notifications"],
  summary: "Replace the authenticated actor's email settings",
  description:
    "`nonCriticalEmail: false` stops reminders and updates. Email that asks the actor to act, or tells them about a decision, still arrives.",
  body: saveEmailPreferencesRequestSchema,
  success: { status: 200, description: "Saved email settings", schema: EmailPreferences },
  errors: [400, 401],
});

export const unsubscribeEmailRoute = defineRoute({
  method: "post",
  path: "/public/email/unsubscribe",
  operationId: "unsubscribeEmail",
  tags: ["notifications"],
  summary: "Turn non-critical email off with the token of an unsubscribe link",
  description:
    "Anonymous: the token in the link is the only credential and it can only turn non-critical email off. Repeating it succeeds. Failures: 400 `api.validation_error`; 404 `notifications.unknown_unsubscribe_token`.",
  public: true,
  body: unsubscribeEmailRequestSchema,
  success: {
    status: 200,
    description: "Non-critical email is off",
    schema: UnsubscribeEmailResponse,
  },
  errors: [400, 404],
  errorDescriptions: { 404: "The unsubscribe link is not valid" },
});

export const runEmailDispatchRoute = defineRoute({
  method: "post",
  path: "/internal/notifications/email-dispatch/run",
  operationId: "runEmailDispatch",
  tags: ["notifications"],
  summary: "Send up to 50 due emails of the outbox",
  description:
    "Service-only Cron target authenticated with the internal bearer secret. Each claimed email is sent, skipped (plan without email, opted out, no address), retried with backoff or failed. A provider outage only delays email; it never touches the command that queued it.",
  success: {
    status: 200,
    description: "Outcomes of this batch",
    schema: RunEmailDispatchResponse,
  },
  errors: [401, 503],
  errorDescriptions: { 503: "No email provider is configured; queued email stays pending" },
});
