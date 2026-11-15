import type { Hono } from "hono";
import {
  getActorPreferencesResponseSchema,
  saveActorPreferencesResponseSchema,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  getActorPreferencesRoute,
  saveActorPreferencesRoute,
} from "@/http/openapi/routes/identity.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerActorPreferencesRoutes(app: Hono, deps: AppDeps): void {
  const { identity } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getActorPreferencesRoute, async (c) => {
    const preferences = await identity.getActorPreferences.execute({ actorId: c.get("actorId") });
    return jsonResponse(getActorPreferencesResponseSchema.parse(preferences));
  });

  secured.openapi(saveActorPreferencesRoute, async (c) => {
    const body = c.req.valid("json");
    const preferences = await identity.saveActorPreferences.execute({
      actorId: c.get("actorId"),
      sidebarLayout: body.sidebarLayout,
    });
    return jsonResponse(saveActorPreferencesResponseSchema.parse(preferences));
  });

  app.route("/", secured);
}
