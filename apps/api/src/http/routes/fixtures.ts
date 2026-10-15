import { fixturePlanSchema } from "@futrob/api-contracts";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { currentRequestCorrelation } from "@/context/request-correlation.ts";
import { failureToHttp } from "@/http/errors.ts";
import { fixturePlanDto } from "@/http/mappers/fixture.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  editFixtureEncounterRoute,
  generateCompetitionFixtureRoute,
  getCompetitionFixtureRoute,
} from "@/http/openapi/routes/fixtures.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerFixtureRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(generateCompetitionFixtureRoute, async (c) => {
    const parsed = c.req.valid("json");
    const params = c.req.valid("param");
    const result = await deps.modules.scheduling.generateFixture.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      generationVersion: parsed.generationVersion,
      startsAt: new Date(parsed.startsAt),
      roundIntervalDays: parsed.roundIntervalDays,
      homeAndAway: parsed.homeAndAway,
      requestId: currentRequestCorrelation()?.requestId,
      seed: parsed.seed?.map(asTeamId),
      groups: parsed.groups,
      playoffs: parsed.playoffs,
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(result.value)));
  });

  secured.openapi(getCompetitionFixtureRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.scheduling.getFixture.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      fixturePlanId: params.fixturePlanId,
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(result.value)));
  });

  secured.openapi(editFixtureEncounterRoute, async (c) => {
    const parsed = c.req.valid("json");
    const params = c.req.valid("param");
    const result = await deps.modules.scheduling.editFixtureEncounter.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      fixturePlanId: params.fixturePlanId,
      encounterId: asEncounterId(params.encounterId),
      reason: parsed.reason,
      requestId: parsed.requestId ?? currentRequestCorrelation()?.requestId ?? crypto.randomUUID(),
      scheduledStartAt: parsed.scheduledStartAt ? new Date(parsed.scheduledStartAt) : undefined,
      homeTeamId: parsed.homeTeamId && parsed.awayTeamId ? asTeamId(parsed.homeTeamId) : undefined,
      awayTeamId: parsed.homeTeamId && parsed.awayTeamId ? asTeamId(parsed.awayTeamId) : undefined,
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(result.value)));
  });

  app.route("/", secured);
}
