import type { Hono } from "hono";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { TaggedError, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { rebuildCompetitionStatisticsResponseSchema } from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import { rebuildCompetitionStatisticsRoute } from "@/http/openapi/routes/statistics.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";
import { failureToHttp, isHttpMappableFailure } from "@/http/errors.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerStatisticsRebuildRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);
  secured.openapi(rebuildCompetitionStatisticsRoute, async (c) => {
    const denied = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: ORGANIZATION_PERMISSION.superusersManage,
      scope: {},
    });
    if (denied) return denied;
    const params = c.req.valid("param");
    try {
      const result = await deps.modules.statistics.useCases.rebuildCompetitionStatistics.execute({
        organizationId: asOrganizationId(params.organizationId),
        competitionId: asCompetitionId(params.competitionId),
      });
      if (result.isErr()) return failureToHttp(result.error);
      return jsonResponse(rebuildCompetitionStatisticsResponseSchema.parse(result.value));
    } catch (error) {
      if (TaggedError.is(error) && isHttpMappableFailure(error)) return failureToHttp(error);
      throw error;
    }
  });
  app.route("/", secured);
}
