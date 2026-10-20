import {
  encounterScheduleSnapshotSchema,
  encounterViewSchema,
  listCompetitionEncountersResponseSchema,
  listEncounterCandidatesResponseSchema,
} from "@futrob/api-contracts";
import { OfficialSelectionForbidden } from "@futrob/results";
import {
  asFixtureStageId,
  ENCOUNTER_PERMISSION,
  encounterStartOf,
  officialMatchSchedules,
  type EncounterScheduleSnapshot,
} from "@futrob/scheduling";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp } from "@/http/errors.ts";
import { competitionEncountersDto, encounterViewDto } from "@/http/mappers/next-encounter.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  getEncounterScheduleSnapshotRoute,
  getEncounterViewRoute,
  listCompetitionEncountersRoute,
  listEncounterCandidatesRoute,
  upsertEncounterScheduleSnapshotRoute,
} from "@/http/openapi/routes/encounters.ts";
import { jsonResponse } from "@/utils/http-response.ts";

/**
 * The Encounter start is derived from the same slot read as `officialMatches`: an
 * application writes every slot in one transaction, so a reschedule committing between
 * the Encounter read and the slot read cannot pair an old start with new slots.
 */
async function scheduleSnapshotResponse(
  deps: AppDeps,
  encounter: EncounterScheduleSnapshot,
): Promise<Response> {
  const schedules = officialMatchSchedules(
    encounter,
    await deps.modules.scheduling.officialMatches.listByEncounter(encounter.encounterId),
  );
  const scheduledStartAt = encounterStartOf(schedules) ?? encounter.scheduledStartAt;
  return jsonResponse(
    encounterScheduleSnapshotSchema.parse({
      ...encounter,
      scheduledStartAt: scheduledStartAt.toISOString(),
      homeExternalClubId: null,
      awayExternalClubId: null,
      providerKey: null,
      officialMatches: schedules.map((schedule) => ({
        officialSlot: schedule.slot,
        scheduledStartAt: schedule.scheduledStartAt.toISOString(),
      })),
    }),
  );
}

export function registerEncounterRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(listEncounterCandidatesRoute, async (c) => {
    const encounterId = asEncounterId(c.req.valid("param").encounterId);
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

  secured.openapi(getEncounterViewRoute, async (c) => {
    const params = c.req.valid("param");
    const notFound = () =>
      apiErrorResponse(404, {
        code: "scheduling.encounter_not_found",
        messageKey: "errors.scheduling.encounter_not_found",
      });
    const encounter = await deps.modules.scheduling.encounters.findById(
      asEncounterId(params.encounterId),
    );
    if (!encounter || encounter.organizationId !== params.organizationId) {
      return notFound();
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
    if (!decision.allowed) return notFound();
    const view = await deps.modules.getEncounterView.execute(encounter);
    if (!view) return notFound();
    return jsonResponse(encounterViewSchema.parse(encounterViewDto(view)));
  });

  secured.openapi(listCompetitionEncountersRoute, async (c) => {
    const params = c.req.valid("param");
    const list = await deps.modules.listCompetitionEncounters.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
    });
    if (!list) {
      return apiErrorResponse(404, {
        code: "competitions.not_found",
        messageKey: "errors.competitions.not_found",
      });
    }
    return jsonResponse(
      listCompetitionEncountersResponseSchema.parse(competitionEncountersDto(list)),
    );
  });

  secured.openapi(getEncounterScheduleSnapshotRoute, async (c) => {
    const encounter = await deps.modules.scheduling.encounters.findById(
      asEncounterId(c.req.valid("param").encounterId),
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
    return scheduleSnapshotResponse(deps, encounter);
  });

  secured.openapi(
    upsertEncounterScheduleSnapshotRoute,
    async (c) => {
      const parsed = c.req.valid("json");
      const result = await deps.modules.scheduling.upsertEncounterSchedule.execute({
        actorId: c.get("actorId"),
        snapshot: {
          encounterId: asEncounterId(c.req.valid("param").encounterId),
          organizationId: asOrganizationId(parsed.organizationId),
          competitionId: asCompetitionId(parsed.competitionId),
          stageId: asFixtureStageId(parsed.stageId),
          homeTeamId: asTeamId(parsed.homeTeamId),
          awayTeamId: asTeamId(parsed.awayTeamId),
          scheduledStartAt: new Date(parsed.scheduledStartAt),
          officialMatchCount: parsed.officialMatchCount,
        },
      });
      if (result.isErr()) return failureToHttp(result.error);
      return scheduleSnapshotResponse(deps, result.value);
    },
    (result) => {
      if (!result.success) {
        return apiErrorResponse(400, {
          code: "api.validation_failed",
          messageKey: "errors.api.validation_failed",
        });
      }
    },
  );

  app.route("/", secured);
}
