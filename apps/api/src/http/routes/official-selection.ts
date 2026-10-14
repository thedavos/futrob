import type { OfficialSelectionCommandOutput } from "@futrob/results";
import { asEncounterId, asOrganizationId, asTeamId, type Result } from "@futrob/shared-kernel";
import { type Context, type Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import {
  teamOfficialSelectionFailureToHttp,
  operatorOfficialSelectionFailureToHttp,
  toOfficialSelectionCommandResponse,
  toOfficialSelectionViewDto,
  type TeamOfficialSelectionError,
  type OperatorOfficialSelectionError,
} from "@/http/mappers/official-selection.ts";
import type { ServiceAuthVariables } from "@/http/middleware/service-auth.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  confirmOfficialSelectionRoute,
  getOperatorOfficialSelectionRoute,
  getTeamOfficialSelectionRoute,
  openMatchDisputeRoute,
  proposeAlternativeOfficialSelectionRoute,
  proposeOfficialSelectionRoute,
  rejectOfficialSelectionRoute,
  resolveMatchDisputeRoute,
  reviewMatchDisputeRoute,
} from "@/http/openapi/routes/results.ts";
import { jsonResponse } from "@/utils/http-response.ts";

type SecuredContext = Context<{ Variables: ServiceAuthVariables }>;

function operatorCommandScope(
  c: SecuredContext,
  body: { expectedVersion: number; commandKey: string },
) {
  const params = c.req.param();
  return {
    actorId: c.get("actorId"),
    organizationId: asOrganizationId(params.organizationId ?? ""),
    encounterId: asEncounterId(params.encounterId ?? ""),
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

/** Authorized reads and mutations over the composed official-selection commands. */
export function registerOfficialSelectionRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);
  const commands = deps.modules.officialSelection;

  secured.openapi(getOperatorOfficialSelectionRoute, async (c) => {
    const params = c.req.valid("param");
    const outcome = await commands.get.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      encounterId: asEncounterId(params.encounterId),
    });
    if (outcome.isErr()) return operatorOfficialSelectionFailureToHttp(outcome.error);
    return jsonResponse(toOfficialSelectionViewDto(outcome.value));
  });

  secured.openapi(reviewMatchDisputeRoute, async (c) => {
    const body = c.req.valid("json");
    return operatorCommandResponse(
      await commands.reviewDispute.execute({
        ...operatorCommandScope(c, body),
        reason: body.reason,
      }),
    );
  });

  secured.openapi(resolveMatchDisputeRoute, async (c) => {
    const body = c.req.valid("json");
    return operatorCommandResponse(
      await commands.resolveDispute.execute({
        ...operatorCommandScope(c, body),
        reason: body.reason,
        decision: body.decision,
      }),
    );
  });

  secured.openapi(getTeamOfficialSelectionRoute, async (c) => {
    const query = c.req.valid("query");
    const params = c.req.valid("param");
    const outcome = await commands.get.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      encounterId: asEncounterId(params.encounterId),
      actingTeamId: asTeamId(query.actingTeamId),
    });
    if (outcome.isErr()) return teamOfficialSelectionFailureToHttp(outcome.error);
    return jsonResponse(toOfficialSelectionViewDto(outcome.value));
  });

  secured.openapi(proposeOfficialSelectionRoute, async (c) => {
    const body = c.req.valid("json");
    return commandResponse(
      await commands.propose.execute({
        ...commandScope(c, body),
        selections: body.selections,
      }),
    );
  });

  secured.openapi(confirmOfficialSelectionRoute, async (c) => {
    const body = c.req.valid("json");
    return commandResponse(
      await commands.confirm.execute({
        ...commandScope(c, body),
        proposalId: c.req.valid("param").proposalId,
      }),
    );
  });

  secured.openapi(rejectOfficialSelectionRoute, async (c) => {
    const body = c.req.valid("json");
    return commandResponse(
      await commands.reject.execute({
        ...commandScope(c, body),
        proposalId: c.req.valid("param").proposalId,
        reason: body.reason,
      }),
    );
  });

  secured.openapi(proposeAlternativeOfficialSelectionRoute, async (c) => {
    const body = c.req.valid("json");
    return commandResponse(
      await commands.proposeAlternative.execute({
        ...commandScope(c, body),
        proposalId: c.req.valid("param").proposalId,
        selections: body.selections,
        reason: body.reason,
      }),
    );
  });

  secured.openapi(openMatchDisputeRoute, async (c) => {
    const body = c.req.valid("json");
    return commandResponse(
      await commands.openDispute.execute({
        ...commandScope(c, body),
        reason: body.reason,
      }),
    );
  });

  app.route("/", secured);
}
