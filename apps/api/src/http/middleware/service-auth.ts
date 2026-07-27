import { createMiddleware } from "hono/factory";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import { apiErrorResponse } from "@/http/errors.ts";

export const ACTOR_ID_HEADER = "x-futrob-actor-id";

export type ServiceAuthVariables = {
  actorId: ActorId;
};

/**
 * Trust boundary for web BFF → apps/api calls.
 * Requires `Authorization: Bearer <INTERNAL_JOB_SECRET>` and `X-Futrob-Actor-Id`.
 */
export function createServiceAuthMiddleware(internalJobSecret: string) {
  return createMiddleware<{ Variables: ServiceAuthVariables }>(async (c, next) => {
    if (!internalJobSecret) {
      return apiErrorResponse(503, {
        code: "api.service_auth_unconfigured",
        messageKey: "errors.api.service_auth_unconfigured",
      });
    }

    const authorization = c.req.header("authorization");
    const expected = `Bearer ${internalJobSecret}`;
    if (!authorization || authorization !== expected) {
      return apiErrorResponse(401, {
        code: "api.unauthorized",
        messageKey: "errors.api.unauthorized",
      });
    }

    const actorHeader = c.req.header(ACTOR_ID_HEADER)?.trim();
    if (!actorHeader) {
      return apiErrorResponse(401, {
        code: "api.missing_actor",
        messageKey: "errors.api.missing_actor",
      });
    }

    c.set("actorId", asActorId(actorHeader));
    await next();
  });
}
