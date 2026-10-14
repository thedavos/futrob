import type { Hono } from "hono";
import { providerHealthResponseSchema } from "@futrob/api-contracts";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import type { AppDeps } from "@/app.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import { getProviderHealthRoute } from "@/http/openapi/routes/game-data.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerProviderHealthRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getProviderHealthRoute, async (c) => {
    const denied = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: ORGANIZATION_PERMISSION.superusersManage,
      scope: {},
    });
    if (denied) return denied;
    const snapshot = await deps.modules.gameData.getProviderHealth.execute(
      c.req.valid("param").providerKey,
    );
    return jsonResponse(
      providerHealthResponseSchema.parse({
        ...snapshot,
        observedAt: snapshot.observedAt.toISOString(),
        windowStartedAt: snapshot.windowStartedAt.toISOString(),
        lastSuccessfulAt: snapshot.lastSuccessfulAt?.toISOString() ?? null,
        lastFailureAt: snapshot.lastFailureAt?.toISOString() ?? null,
      }),
    );
  });

  app.route("/", secured);
}
