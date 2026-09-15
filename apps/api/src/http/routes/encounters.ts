import {
  encounterScheduleSnapshotSchema,
  listEncounterCandidatesResponseSchema,
  upsertEncounterScheduleSnapshotRequestSchema,
} from "@futrob/api-contracts";
import { OfficialSelectionForbidden } from "@futrob/results";
import { asFixtureStageId, ENCOUNTER_PERMISSION } from "@futrob/scheduling";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerEncounterRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/encounters/:encounterId/candidates", async (c) => {
    const encounterId = asEncounterId(c.req.param("encounterId"));
    const encounter = await deps.modules.scheduling.encounters.findById(encounterId);
    if (!encounter) {
      return apiErrorResponse(404, {
        code: "results.encounter_not_found",
        messageKey: "errors.results.encounter_not_found",
      });
    }

    const result = await deps.modules.results.listEncounterCandidates.execute({
      actorId: c.get("actorId"),
      organizationId: encounter.organizationId,
      encounterId,
    });
    if (result.isErr()) {
      if (OfficialSelectionForbidden.is(result.error)) {
        return apiErrorResponse(404, {
          code: "results.encounter_not_found",
          messageKey: "errors.results.encounter_not_found",
        });
      }
      return failureToHttp(result.error);
    }

    switch (result.value.status) {
      case "ready":
        return jsonResponse(
          listEncounterCandidatesResponseSchema.parse({
            ...result.value,
            window: {
              from: result.value.window.from.toISOString(),
              to: result.value.window.to.toISOString(),
            },
            candidates: result.value.candidates.map((candidate) => ({
              ...candidate,
              occurredAt: candidate.occurredAt.toISOString(),
            })),
          }),
        );
      case "clubs_not_connected":
      case "provider_mismatch":
        return jsonResponse(listEncounterCandidatesResponseSchema.parse(result.value));
      default: {
        const exhaustive: never = result.value;
        return exhaustive;
      }
    }
  });

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
        stageId: asFixtureStageId(parsed.data.stageId),
        homeTeamId: asTeamId(parsed.data.homeTeamId),
        awayTeamId: asTeamId(parsed.data.awayTeamId),
        scheduledStartAt: new Date(parsed.data.scheduledStartAt),
        officialMatchCount: parsed.data.officialMatchCount,
      },
    });
    if (result.isErr()) return failureToHttp(result.error);
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

  app.route("/", secured);
}
