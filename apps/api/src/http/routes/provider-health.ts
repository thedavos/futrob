import { Hono } from "hono";
import {
  gameDataProviderKeyQuerySchema,
  providerHealthResponseSchema,
} from "@futrob/api-contracts";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import type { AppDeps } from "@/app.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { validationErrorResponse } from "@/http/errors.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerProviderHealthRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/internal/game-data/providers/:providerKey/health", async (c) => {
    const parsed = gameDataProviderKeyQuerySchema.safeParse(c.req.param("providerKey"));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const denied = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: ORGANIZATION_PERMISSION.superusersManage,
      scope: {},
    });
    if (denied) return denied;
    const snapshot = await deps.modules.gameData.getProviderHealth.execute(parsed.data);
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
