import {
  editFixtureEncounterRequestSchema,
  encounterScheduleSnapshotSchema,
  fixturePlanSchema,
  generateCompetitionFixtureRequestSchema,
  upsertEncounterScheduleSnapshotRequestSchema,
} from "@futrob/api-contracts";
import { ENCOUNTER_PERMISSION } from "@futrob/scheduling";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import { fixturePlanDto } from "@/http/mappers/fixture.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerEncounterRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/encounters/:encounterId/schedule-snapshot", async (c) => {
    const encounter = await deps.modules.scheduling.encounters.findById(
      asEncounterId(c.req.param("encounterId")),
    );
    if (!encounter) {
      return apiErrorResponse(404, {
        code: "scheduling.encounter_not_found",
        messageKey: "errors.scheduling.encounter_not_found",
      });
    }
    const decision = await deps.modules.authorization.port.decide({
      actorId: c.get("actorId"),
      permission: ENCOUNTER_PERMISSION.read,
      scope: {
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        encounterId: encounter.encounterId,
      },
    });
    if (!decision.allowed) {
      return apiErrorResponse(404, {
        code: "scheduling.encounter_not_found",
        messageKey: "errors.scheduling.encounter_not_found",
      });
    }
    return jsonResponse(
      encounterScheduleSnapshotSchema.parse({
        ...encounter,
        scheduledStartAt: encounter.scheduledStartAt.toISOString(),
        homeExternalClubId: null,
        awayExternalClubId: null,
        providerKey: null,
      }),
    );
  });

  secured.put("/encounters/:encounterId/schedule-snapshot", async (c) => {
    const parsed = upsertEncounterScheduleSnapshotRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return apiErrorResponse(400, {
        code: "api.validation_failed",
        messageKey: "errors.api.validation_failed",
      });
    }
    const result = await deps.modules.scheduling.upsertEncounterSchedule.execute({
      actorId: c.get("actorId"),
      snapshot: {
        encounterId: asEncounterId(c.req.param("encounterId")),
        organizationId: asOrganizationId(parsed.data.organizationId),
        competitionId: asCompetitionId(parsed.data.competitionId),
        homeTeamId: asTeamId(parsed.data.homeTeamId),
        awayTeamId: asTeamId(parsed.data.awayTeamId),
        scheduledStartAt: new Date(parsed.data.scheduledStartAt),
        officialMatchCount: parsed.data.officialMatchCount,
      },
    });
    if (result.isErr()) {
      return apiErrorResponse(result.error.code === "authorization.forbidden" ? 403 : 400, {
        code: result.error.code,
        messageKey: `errors.${result.error.code}`,
      });
    }
    return jsonResponse(
      encounterScheduleSnapshotSchema.parse({
        ...result.value,
        scheduledStartAt: result.value.scheduledStartAt.toISOString(),
        homeExternalClubId: null,
        awayExternalClubId: null,
        providerKey: null,
      }),
    );
  });

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
      requestId: c.req.header("X-Request-ID") ?? randomUUID(),
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(result.value)));
  });

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/fixtures/:fixturePlanId",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const plan = await deps.modules.scheduling.fixturePlans.findById(
        organizationId,
        competitionId,
        c.req.param("fixturePlanId"),
      );
      if (!plan) {
        return apiErrorResponse(404, {
          code: "scheduling.fixture_plan_not_found",
          messageKey: "errors.scheduling.fixture_plan_not_found",
        });
      }
      const decision = await deps.modules.authorization.port.decide({
        actorId: c.get("actorId"),
        permission: ENCOUNTER_PERMISSION.read,
        scope: { organizationId, competitionId },
      });
      if (!decision.allowed) {
        return apiErrorResponse(404, {
          code: "scheduling.fixture_plan_not_found",
          messageKey: "errors.scheduling.fixture_plan_not_found",
        });
      }
      return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(plan)));
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
        requestId: c.req.header("X-Request-ID") ?? randomUUID(),
      });
      if (result.isErr()) return failureToHttp(result.error);
      const plan = await deps.modules.scheduling.fixturePlans.findById(
        asOrganizationId(c.req.param("organizationId")),
        asCompetitionId(c.req.param("competitionId")),
        c.req.param("fixturePlanId"),
      );
      if (!plan) {
        return apiErrorResponse(409, {
          code: "scheduling.fixture_update_conflict",
          messageKey: "errors.scheduling.fixture_update_conflict",
        });
      }
      return jsonResponse(fixturePlanSchema.parse(fixturePlanDto(plan)));
    },
  );

  app.route("/", secured);
}
