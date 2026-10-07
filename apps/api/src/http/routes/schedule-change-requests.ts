import {
  acceptScheduleChangeProposalRequestSchema,
  counterScheduleChangeProposalRequestSchema,
  createScheduleChangeRequestSchema,
  listScheduleChangeRequestsResponseSchema,
  rejectScheduleChangeProposalRequestSchema,
  scheduleChangeCommandResponseSchema,
  scheduleChangeRequestSchema,
} from "@futrob/api-contracts";
import type { ScheduleChangeCommandOutput, ScheduleChangeResponder } from "@futrob/scheduling";
import { asEncounterId, asTeamId, type Result } from "@futrob/shared-kernel";
import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { AppDeps } from "@/app.ts";
import {
  apiErrorResponse,
  failureToHttp,
  validationErrorResponse,
  type HttpMappableFailure,
} from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import {
  toScheduleChangeCommandResponse,
  toScheduleChangeRequestDto,
} from "@/http/mappers/schedule-change-request.ts";
import { jsonResponse } from "@/utils/http-response.ts";

const BASE = "/encounters/:encounterId/schedule-change-requests";
const PROPOSAL = `${BASE}/:requestId/proposals/:proposalId`;

type SecuredContext = Context<{ Variables: ServiceAuthVariables }>;

async function parseBody<Body>(
  c: SecuredContext,
  schema: z.ZodType<Body>,
): Promise<z.ZodSafeParseResult<Body>> {
  return schema.safeParse(await c.req.json().catch(() => null));
}

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
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));
  const scheduling = deps.modules.scheduling;

  /**
   * Scope every response command shares: the actor comes from service auth and the
   * tenant from the stored Encounter, never from the body.
   */
  async function commandScope(
    c: SecuredContext,
    body: { expectedVersion: number; commandKey: string },
  ) {
    const encounterId = asEncounterId(c.req.param("encounterId") ?? "");
    const encounter = await scheduling.encounters.findById(encounterId);
    if (!encounter) return null;
    return {
      actorId: c.get("actorId"),
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId,
      requestId: c.req.param("requestId") ?? "",
      proposalId: c.req.param("proposalId") ?? "",
      expectedVersion: body.expectedVersion,
      commandKey: body.commandKey,
    };
  }

  secured.get(BASE, async (c) => {
    const result = await scheduling.listScheduleChangeRequests.execute({
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

  secured.post(BASE, async (c) => {
    const parsed = await parseBody(c, createScheduleChangeRequestSchema);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const encounterId = asEncounterId(c.req.param("encounterId"));
    const encounter = await scheduling.encounters.findById(encounterId);
    if (!encounter) return encounterNotFound();

    const result = await scheduling.createScheduleChangeRequest.execute({
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

  secured.get(`${BASE}/:requestId`, async (c) => {
    const result = await scheduling.getScheduleChangeRequest.execute({
      actorId: c.get("actorId"),
      encounterId: asEncounterId(c.req.param("encounterId")),
      requestId: c.req.param("requestId"),
    });
    if (result.isErr()) return failureToHttp(result.error);
    return jsonResponse(
      scheduleChangeRequestSchema.parse(toScheduleChangeRequestDto(result.value)),
    );
  });

  secured.post(`${PROPOSAL}/accept`, async (c) => {
    const body = await parseBody(c, acceptScheduleChangeProposalRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    const scope = await commandScope(c, body.data);
    if (!scope) return encounterNotFound();
    return commandResponse(
      await scheduling.acceptScheduleChangeProposal.execute({
        ...scope,
        responder: toResponder(body.data.responder),
      }),
    );
  });

  secured.post(`${PROPOSAL}/reject`, async (c) => {
    const body = await parseBody(c, rejectScheduleChangeProposalRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    const scope = await commandScope(c, body.data);
    if (!scope) return encounterNotFound();
    return commandResponse(
      await scheduling.rejectScheduleChangeProposal.execute({
        ...scope,
        responder: toResponder(body.data.responder),
        reason: body.data.reason,
      }),
    );
  });

  secured.post(`${PROPOSAL}/counter`, async (c) => {
    const body = await parseBody(c, counterScheduleChangeProposalRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    const scope = await commandScope(c, body.data);
    if (!scope) return encounterNotFound();
    return commandResponse(
      await scheduling.counterScheduleChangeProposal.execute({
        ...scope,
        teamId: asTeamId(body.data.teamId),
        timeZone: body.data.timeZone,
        proposedWallTime: body.data.proposedWallTime,
        reason: body.data.reason,
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
