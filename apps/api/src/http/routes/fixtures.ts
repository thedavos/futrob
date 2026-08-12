import {
  editFixtureEncounterRequestSchema,
  fixturePlanSchema,
  generateCompetitionFixtureRequestSchema,
} from "@futrob/api-contracts";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { currentRequestCorrelation } from "@/context/request-correlation.ts";
import { failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import { fixturePlanDto } from "@/http/mappers/fixture.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerFixtureRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.post("/organizations/:organizationId/competitions/:competitionId/fixture", async (c) => {
    const parsed = generateCompetitionFixtureRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.scheduling.generateFixture.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.param("organizationId")),
      competitionId: asCompetitionId(c.req.param("competitionId")),
      generationVersion: parsed.data.generationVersion,
      startsAt: new Date(parsed.data.startsAt),
      roundIntervalDays: parsed.data.roundIntervalDays,
      homeAndAway: parsed.data.homeAndAway,
      ...(parsed.data.seed ? { seed: parsed.data.seed.map(asTeamId) } : {}),
      ...(parsed.data.groups ? { groups: parsed.data.groups } : {}),
      ...(parsed.data.playoffs ? { playoffs: parsed.data.playoffs } : {}),
      requestId: currentRequestCorrelation()?.requestId,
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(result.value)));
  });

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/fixtures/:fixturePlanId",
    async (c) => {
      const result = await deps.modules.scheduling.getFixture.execute({
        actorId: c.get("actorId"),
        organizationId: asOrganizationId(c.req.param("organizationId")),
        competitionId: asCompetitionId(c.req.param("competitionId")),
        fixturePlanId: c.req.param("fixturePlanId"),
      });
      if (result.isErr()) return failureToHttp(result.error);
      return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(result.value)));
    },
  );

  secured.patch(
    "/organizations/:organizationId/competitions/:competitionId/fixtures/:fixturePlanId/encounters/:encounterId",
    async (c) => {
      const parsed = editFixtureEncounterRequestSchema.safeParse(await c.req.json());
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);
      const result = await deps.modules.scheduling.editFixtureEncounter.execute({
        actorId: c.get("actorId"),
        organizationId: asOrganizationId(c.req.param("organizationId")),
        competitionId: asCompetitionId(c.req.param("competitionId")),
        fixturePlanId: c.req.param("fixturePlanId"),
        encounterId: asEncounterId(c.req.param("encounterId")),
        ...(parsed.data.scheduledStartAt
          ? { scheduledStartAt: new Date(parsed.data.scheduledStartAt) }
          : {}),
        ...(parsed.data.homeTeamId && parsed.data.awayTeamId
          ? {
              homeTeamId: asTeamId(parsed.data.homeTeamId),
              awayTeamId: asTeamId(parsed.data.awayTeamId),
            }
          : {}),
        reason: parsed.data.reason,
        requestId:
          parsed.data.requestId ?? currentRequestCorrelation()?.requestId ?? crypto.randomUUID(),
      });
      if (result.isErr()) return failureToHttp(result.error);
      return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(result.value)));
    },
  );

  app.route("/", secured);
}
