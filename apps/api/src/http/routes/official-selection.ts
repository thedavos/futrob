import {
  confirmOfficialSelectionRequestSchema,
  getTeamOfficialSelectionQuerySchema,
  openMatchDisputeRequestSchema,
  proposeAlternativeOfficialSelectionRequestSchema,
  proposeOfficialSelectionRequestSchema,
  rejectOfficialSelectionRequestSchema,
} from "@futrob/api-contracts";
import type { OfficialSelectionCommandOutput } from "@futrob/results";
import { asEncounterId, asOrganizationId, asTeamId, type Result } from "@futrob/shared-kernel";
import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { AppDeps } from "@/app.ts";
import { validationErrorResponse } from "@/http/errors.ts";
import {
  teamOfficialSelectionFailureToHttp,
  toOfficialSelectionCommandResponse,
  toOfficialSelectionViewDto,
  type TeamOfficialSelectionError,
} from "@/http/mappers/official-selection.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

const BASE = "/organizations/:organizationId/encounters/:encounterId/official-selection";

type SecuredContext = Context<{ Variables: ServiceAuthVariables }>;

/** Scope every Team command shares: the actor comes from service auth, never from the body. */
function commandScope(
  c: SecuredContext,
  body: { actingTeamId: string; expectedVersion: number; commandKey: string },
) {
  return {
    actorId: c.get("actorId"),
    organizationId: asOrganizationId(c.req.param("organizationId") ?? ""),
    encounterId: asEncounterId(c.req.param("encounterId") ?? ""),
    actingTeamId: asTeamId(body.actingTeamId),
    expectedVersion: body.expectedVersion,
    commandKey: body.commandKey,
  };
}

function commandResponse(
  outcome: Result<OfficialSelectionCommandOutput, TeamOfficialSelectionError>,
): Response {
  if (outcome.isErr()) return teamOfficialSelectionFailureToHttp(outcome.error);
  return jsonResponse(toOfficialSelectionCommandResponse(outcome.value));
}

async function parseBody<Body>(
  c: SecuredContext,
  schema: z.ZodType<Body>,
): Promise<z.ZodSafeParseResult<Body>> {
  return schema.safeParse(await c.req.json().catch(() => null));
}

/** Team representative routes over the composed official-selection commands. */
export function registerOfficialSelectionRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));
  const commands = deps.modules.officialSelection;

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
