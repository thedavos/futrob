import {
  listScheduleChangeRequestsResponseSchema,
  scheduleChangeCommandResponseSchema,
  scheduleChangeRequestSchema,
  type acceptScheduleChangeProposalRequestSchema,
} from "@futrob/api-contracts";
import type { ScheduleChangeCommandOutput, ScheduleChangeResponder } from "@futrob/scheduling";
import { asEncounterId, asTeamId, type Result } from "@futrob/shared-kernel";
import { type Context, type Hono } from "hono";
import type { z } from "zod";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, type HttpMappableFailure } from "@/http/errors.ts";
import type { ServiceAuthVariables } from "@/http/middleware/service-auth.ts";
import {
  toScheduleChangeCommandResponse,
  toScheduleChangeListResponse,
  toScheduleChangeRequestDto,
} from "@/http/mappers/schedule-change-request.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  acceptScheduleChangeProposalRoute,
  counterScheduleChangeProposalRoute,
  createScheduleChangeRequestRoute,
  getScheduleChangeRequestRoute,
  listScheduleChangeRequestsRoute,
  rejectScheduleChangeProposalRoute,
  resolveScheduleChangeRequestRoute,
} from "@/http/openapi/routes/encounters.ts";
import { jsonResponse } from "@/utils/http-response.ts";

type SecuredContext = Context<{ Variables: ServiceAuthVariables }>;

function toResponder(
  responder: z.infer<typeof acceptScheduleChangeProposalRequestSchema>["responder"],
): ScheduleChangeResponder {
  return responder.authority === "rival_team"
    ? { authority: "rival_team", teamId: asTeamId(responder.teamId) }
    : { authority: "organizer" };
}

function commandResponse(
  outcome: Result<ScheduleChangeCommandOutput, HttpMappableFailure>,
): Response {
  if (outcome.isErr()) return failureToHttp(outcome.error);
  return jsonResponse(
    scheduleChangeCommandResponseSchema.parse(toScheduleChangeCommandResponse(outcome.value)),
  );
}

export function registerScheduleChangeRequestRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);
  const scheduling = deps.modules.scheduling;

  /**
   * Scope every response command shares: the actor comes from service auth and the
   * tenant from the stored Encounter, never from the body.
   */
  async function commandScope(
    c: SecuredContext,
    body: { expectedVersion: number; commandKey: string },
  ) {
    const params = c.req.param();
    const encounterId = asEncounterId(params.encounterId ?? "");
    const encounter = await scheduling.encounters.findById(encounterId);
    if (!encounter) return null;
    return {
      actorId: c.get("actorId"),
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId,
      requestId: params.requestId ?? "",
      proposalId: params.proposalId ?? "",
      expectedVersion: body.expectedVersion,
      commandKey: body.commandKey,
    };
  }

  secured.openapi(listScheduleChangeRequestsRoute, async (c) => {
    const result = await scheduling.listScheduleChangeRequests.execute({
      actorId: c.get("actorId"),
      encounterId: asEncounterId(c.req.valid("param").encounterId),
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(
      listScheduleChangeRequestsResponseSchema.parse(toScheduleChangeListResponse(result.value)),
    );
  });

  secured.openapi(createScheduleChangeRequestRoute, async (c) => {
    const parsed = c.req.valid("json");
    const encounterId = asEncounterId(c.req.valid("param").encounterId);
    const encounter = await scheduling.encounters.findById(encounterId);
    if (!encounter) return encounterNotFound();

    const result = await scheduling.createScheduleChangeRequest.execute({
      actorId: c.get("actorId"),
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId,
      requestingTeamId: asTeamId(parsed.requestingTeamId),
      scope: parsed.scope,
      timeZone: parsed.timeZone,
      proposedWallTime: parsed.proposedWallTime,
      reason: parsed.reason,
      idempotencyKey: parsed.idempotencyKey,
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(
      scheduleChangeRequestSchema.parse(toScheduleChangeRequestDto(result.value)),
    );
  });

  secured.openapi(getScheduleChangeRequestRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await scheduling.getScheduleChangeRequest.execute({
      actorId: c.get("actorId"),
      encounterId: asEncounterId(params.encounterId),
      requestId: params.requestId,
    });
    if (result.isErr()) return failureToHttp(result.error);
    const { request, capabilities } = result.value;
    return jsonResponse(
      scheduleChangeRequestSchema.parse(toScheduleChangeRequestDto(request, capabilities)),
    );
  });

  secured.openapi(resolveScheduleChangeRequestRoute, async (c) => {
    const body = c.req.valid("json");
    const scope = await commandScope(c, body);
    if (!scope) return encounterNotFound();
    const resolution = body.resolution;
    return commandResponse(
      await scheduling.resolveScheduleChangeRequest.execute({
        ...scope,
        proposalId: body.proposalId,
        resolution:
          resolution.outcome === "schedule_set"
            ? { ...resolution, proposedStartAt: new Date(resolution.proposedStartAt) }
            : resolution.outcome === "walkover_intended"
              ? { ...resolution, winningTeamId: asTeamId(resolution.winningTeamId) }
              : resolution,
      }),
    );
  });

  secured.openapi(acceptScheduleChangeProposalRoute, async (c) => {
    const body = c.req.valid("json");
    const scope = await commandScope(c, body);
    if (!scope) return encounterNotFound();
    return commandResponse(
      await scheduling.acceptScheduleChangeProposal.execute({
        ...scope,
        responder: toResponder(body.responder),
      }),
    );
  });

  secured.openapi(rejectScheduleChangeProposalRoute, async (c) => {
    const body = c.req.valid("json");
    const scope = await commandScope(c, body);
    if (!scope) return encounterNotFound();
    return commandResponse(
      await scheduling.rejectScheduleChangeProposal.execute({
        ...scope,
        responder: toResponder(body.responder),
        reason: body.reason,
      }),
    );
  });

  secured.openapi(counterScheduleChangeProposalRoute, async (c) => {
    const body = c.req.valid("json");
    const scope = await commandScope(c, body);
    if (!scope) return encounterNotFound();
    return commandResponse(
      await scheduling.counterScheduleChangeProposal.execute({
        ...scope,
        teamId: asTeamId(body.teamId),
        timeZone: body.timeZone,
        proposedWallTime: body.proposedWallTime,
        reason: body.reason,
      }),
    );
  });

  app.route("/", secured);
}

function encounterNotFound(): Response {
  return apiErrorResponse(404, {
    code: "scheduling.schedule_change_encounter_not_found",
    messageKey: "errors.scheduling.schedule_change_encounter_not_found",
  });
}
