import {
  getEmailPreferencesResponseSchema,
  runEmailDispatchResponseSchema,
  saveEmailPreferencesResponseSchema,
  unsubscribeEmailResponseSchema,
} from "@futrob/api-contracts";
import type { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp } from "@/http/errors.ts";
import {
  createInternalOpenApiRouter,
  createOpenApiRouter,
  createServiceOpenApiRouter,
} from "@/http/openapi/router.ts";
import {
  getEmailPreferencesRoute,
  runEmailDispatchRoute,
  saveEmailPreferencesRoute,
  unsubscribeEmailRoute,
} from "@/http/openapi/routes/notifications.ts";
import { jsonResponse } from "@/utils/http-response.ts";

/** Anonymous unsubscribe. Register before any router with auth middleware. */
export function registerPublicEmailRoutes(app: Hono, deps: AppDeps): void {
  const { email } = deps.modules.notifications;

  const router = createOpenApiRouter();
  router.openapi(unsubscribeEmailRoute, async (c) => {
    const result = await email.unsubscribe.execute({ token: c.req.valid("json").token });
    if (!result.isOk()) return failureToHttp(result.error, 404);
    return jsonResponse(unsubscribeEmailResponseSchema.parse({ nonCriticalEmail: false }));
  });
  app.route("/", router);
}

/** Service-only outbox runner woken by the web Worker Cron. Register with the other jobs. */
export function registerEmailDispatchRoutes(app: Hono, deps: AppDeps): void {
  const { email } = deps.modules.notifications;
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);
  internal.openapi(runEmailDispatchRoute, async () => {
    if (!email.dispatch) {
      return apiErrorResponse(503, {
        code: "notifications.email_provider_not_configured",
        messageKey: "errors.notifications.email_provider_not_configured",
      });
    }
    return jsonResponse(runEmailDispatchResponseSchema.parse(await email.dispatch.execute()));
  });
  app.route("/", internal);
}

export function registerEmailPreferenceRoutes(app: Hono, deps: AppDeps): void {
  const { email } = deps.modules.notifications;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getEmailPreferencesRoute, async (c) => {
    const preferences = await email.getPreferences.execute({ actorId: c.get("actorId") });
    return jsonResponse(getEmailPreferencesResponseSchema.parse(preferences));
  });

  secured.openapi(saveEmailPreferencesRoute, async (c) => {
    const body = c.req.valid("json");
    const preferences = await email.savePreferences.execute({
      actorId: c.get("actorId"),
      locale: body.locale,
      nonCriticalEmail: body.nonCriticalEmail,
    });
    return jsonResponse(saveEmailPreferencesResponseSchema.parse(preferences));
  });

  app.route("/", secured);
}
