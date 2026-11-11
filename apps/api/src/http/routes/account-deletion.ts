import {
  accountDeletionStatusSchema,
  runAccountDeletionResponseSchema,
  type AccountDeletionStatusDto,
} from "@futrob/api-contracts";
import type { AccountDeletionStatus } from "@futrob/identity";
import type { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createInternalOpenApiRouter, createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  cancelAccountDeletionRoute,
  getAccountDeletionRoute,
  requestAccountDeletionRoute,
  runAccountDeletionRoute,
} from "@/http/openapi/routes/identity.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function accountDeletionStatusDto(status: AccountDeletionStatus): AccountDeletionStatusDto {
  return accountDeletionStatusSchema.parse({
    deletion:
      status.state.kind === "scheduled"
        ? {
            status: "scheduled",
            requestedAt: status.state.requestedAt.toISOString(),
            scheduledFor: status.state.scheduledFor.toISOString(),
          }
        : { status: "active" },
    blockers: status.blockers,
  });
}

export function registerAccountDeletionRoutes(app: Hono, deps: AppDeps): void {
  const { accountDeletion } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getAccountDeletionRoute, async (c) => {
    const result = await accountDeletion.get.execute({ actorId: c.get("actorId") });
    if (result.isOk()) return jsonResponse(accountDeletionStatusDto(result.value));
    return failureToHttp(result.error, 404);
  });

  secured.openapi(requestAccountDeletionRoute, async (c) => {
    const { password } = c.req.valid("json");
    const result = await accountDeletion.request.execute({ actorId: c.get("actorId"), password });
    if (result.isOk()) return jsonResponse(accountDeletionStatusDto(result.value));
    // 403, not 401: the session is valid, so clients must not treat it as signed out.
    return result.error.code === "identity.reauthentication_failed"
      ? failureToHttp(result.error, 403)
      : failureToHttp(
          { code: result.error.code, details: { blockers: [...result.error.details.blockers] } },
          409,
        );
  });

  secured.openapi(cancelAccountDeletionRoute, async (c) => {
    const result = await accountDeletion.cancel.execute({ actorId: c.get("actorId") });
    if (result.isOk()) return jsonResponse(accountDeletionStatusDto(result.value));
    return failureToHttp(result.error, 404);
  });

  app.route("/", secured);
}

/** Cron target; registered with the other internal jobs, before any actor-scoped router. */
export function registerAccountDeletionJobRoutes(app: Hono, deps: AppDeps): void {
  const { accountDeletion } = deps.modules;
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);
  internal.openapi(runAccountDeletionRoute, async () => {
    const result = await accountDeletion.run.execute();
    return jsonResponse(runAccountDeletionResponseSchema.parse(result));
  });
  app.route("/", internal);
}
