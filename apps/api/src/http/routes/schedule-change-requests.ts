import {
  createScheduleChangeRequestSchema,
  listScheduleChangeRequestsResponseSchema,
  scheduleChangeRequestSchema,
} from "@futrob/api-contracts";
import { asEncounterId, asTeamId } from "@futrob/shared-kernel";
import { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { toScheduleChangeRequestDto } from "@/http/mappers/schedule-change-request.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerScheduleChangeRequestRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/encounters/:encounterId/schedule-change-requests", async (c) => {
    const result = await deps.modules.scheduling.listScheduleChangeRequests.execute({
      actorId: c.get("actorId"),
      encounterId: asEncounterId(c.req.param("encounterId")),
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(
      listScheduleChangeRequestsResponseSchema.parse({
        requests: result.value.map(toScheduleChangeRequestDto),
      }),
    );
  });

  secured.post("/encounters/:encounterId/schedule-change-requests", async (c) => {
    const parsed = createScheduleChangeRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const encounterId = asEncounterId(c.req.param("encounterId"));
    const encounter = await deps.modules.scheduling.encounters.findById(encounterId);
    if (!encounter) {
      return apiErrorResponse(404, {
        code: "scheduling.schedule_change_encounter_not_found",
        messageKey: "errors.scheduling.schedule_change_encounter_not_found",
      });
    }

    const result = await deps.modules.scheduling.createScheduleChangeRequest.execute({
      actorId: c.get("actorId"),
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId,
      requestingTeamId: asTeamId(parsed.data.requestingTeamId),
      scope: parsed.data.scope,
      timeZone: parsed.data.timeZone,
      proposedWallTime: parsed.data.proposedWallTime,
      reason: parsed.data.reason,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(
      scheduleChangeRequestSchema.parse(toScheduleChangeRequestDto(result.value)),
    );
  });

  app.route("/", secured);
}
