import {
  confirmOfficialSelectionRequestSchema,
  getTeamOfficialSelectionQuerySchema,
  openMatchDisputeRequestSchema,
  proposeAlternativeOfficialSelectionRequestSchema,
  proposeOfficialSelectionRequestSchema,
  rejectOfficialSelectionRequestSchema,
  resolveMatchDisputeRequestSchema,
  reviewMatchDisputeRequestSchema,
} from "@futrob/api-contracts";
import type { OfficialSelectionCommandOutput } from "@futrob/results";
import { asEncounterId, asOrganizationId, asTeamId, type Result } from "@futrob/shared-kernel";
import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { AppDeps } from "@/app.ts";
import { validationErrorResponse } from "@/http/errors.ts";
import {
  teamOfficialSelectionFailureToHttp,
  operatorOfficialSelectionFailureToHttp,
  toOfficialSelectionCommandResponse,
  toOfficialSelectionViewDto,
  type TeamOfficialSelectionError,
  type OperatorOfficialSelectionError,
} from "@/http/mappers/official-selection.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

const BASE = "/organizations/:organizationId/encounters/:encounterId/official-selection";

type SecuredContext = Context<{ Variables: ServiceAuthVariables }>;

function operatorCommandScope(
  c: SecuredContext,
  body: { expectedVersion: number; commandKey: string },
) {
  return {
    actorId: c.get("actorId"),
    organizationId: asOrganizationId(c.req.param("organizationId") ?? ""),
    encounterId: asEncounterId(c.req.param("encounterId") ?? ""),
    expectedVersion: body.expectedVersion,
    commandKey: body.commandKey,
  };
}

function commandScope(
  c: SecuredContext,
  body: { actingTeamId: string; expectedVersion: number; commandKey: string },
) {
  return { ...operatorCommandScope(c, body), actingTeamId: asTeamId(body.actingTeamId) };
}

function commandResponse(
  outcome: Result<OfficialSelectionCommandOutput, TeamOfficialSelectionError>,
): Response {
  if (outcome.isErr()) return teamOfficialSelectionFailureToHttp(outcome.error);
  return jsonResponse(toOfficialSelectionCommandResponse(outcome.value));
}

function operatorCommandResponse(
  outcome: Result<OfficialSelectionCommandOutput, OperatorOfficialSelectionError>,
): Response {
  if (outcome.isErr()) return operatorOfficialSelectionFailureToHttp(outcome.error);
  return jsonResponse(toOfficialSelectionCommandResponse(outcome.value));
}

async function parseBody<Body>(
  c: SecuredContext,
  schema: z.ZodType<Body>,
): Promise<z.ZodSafeParseResult<Body>> {
  return schema.safeParse(await c.req.json().catch(() => null));
}

/** Authorized reads and mutations over the composed official-selection commands. */
export function registerOfficialSelectionRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));
  const commands = deps.modules.officialSelection;

  secured.get(`${BASE}/disputes`, async (c) => {
    const outcome = await commands.get.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.param("organizationId")),
      encounterId: asEncounterId(c.req.param("encounterId")),
    });
    if (outcome.isErr()) return operatorOfficialSelectionFailureToHttp(outcome.error);
    return jsonResponse(toOfficialSelectionViewDto(outcome.value));
  });

  secured.post(`${BASE}/disputes/review`, async (c) => {
    const body = await parseBody(c, reviewMatchDisputeRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    return operatorCommandResponse(
      await commands.reviewDispute.execute({
        ...operatorCommandScope(c, body.data),
        reason: body.data.reason,
      }),
    );
  });

  secured.post(`${BASE}/disputes/resolve`, async (c) => {
    const body = await parseBody(c, resolveMatchDisputeRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    return operatorCommandResponse(
      await commands.resolveDispute.execute({
        ...operatorCommandScope(c, body.data),
        reason: body.data.reason,
        decision: body.data.decision,
      }),
    );
  });

  secured.get(BASE, async (c) => {
    const query = getTeamOfficialSelectionQuerySchema.safeParse(c.req.query());
    if (!query.success) return validationErrorResponse(query.error.issues);
    const outcome = await commands.get.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.param("organizationId")),
      encounterId: asEncounterId(c.req.param("encounterId")),
      actingTeamId: asTeamId(query.data.actingTeamId),
    });
    if (outcome.isErr()) return teamOfficialSelectionFailureToHttp(outcome.error);
    return jsonResponse(toOfficialSelectionViewDto(outcome.value));
  });

  secured.post(`${BASE}/proposals`, async (c) => {
    const body = await parseBody(c, proposeOfficialSelectionRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    return commandResponse(
      await commands.propose.execute({
        ...commandScope(c, body.data),
        selections: body.data.selections,
      }),
    );
  });

  secured.post(`${BASE}/proposals/:proposalId/confirm`, async (c) => {
    const body = await parseBody(c, confirmOfficialSelectionRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    return commandResponse(
      await commands.confirm.execute({
        ...commandScope(c, body.data),
        proposalId: c.req.param("proposalId"),
      }),
    );
  });

  secured.post(`${BASE}/proposals/:proposalId/reject`, async (c) => {
    const body = await parseBody(c, rejectOfficialSelectionRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    return commandResponse(
      await commands.reject.execute({
        ...commandScope(c, body.data),
        proposalId: c.req.param("proposalId"),
        reason: body.data.reason,
      }),
    );
  });

  secured.post(`${BASE}/proposals/:proposalId/alternative`, async (c) => {
    const body = await parseBody(c, proposeAlternativeOfficialSelectionRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    return commandResponse(
      await commands.proposeAlternative.execute({
        ...commandScope(c, body.data),
        proposalId: c.req.param("proposalId"),
        selections: body.data.selections,
        reason: body.data.reason,
      }),
    );
  });

  secured.post(`${BASE}/disputes`, async (c) => {
    const body = await parseBody(c, openMatchDisputeRequestSchema);
    if (!body.success) return validationErrorResponse(body.error.issues);
    return commandResponse(
      await commands.openDispute.execute({
        ...commandScope(c, body.data),
        reason: body.data.reason,
      }),
    );
  });

  app.route("/", secured);
}
