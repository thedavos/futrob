import { failureToHttp } from "@/http/errors.ts";
import type { OfficialSelectionCommandOutput } from "@futrob/results";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type Result,
} from "@futrob/shared-kernel";
import { type Context, type Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import {
  teamOfficialSelectionFailureToHttp,
  operatorOfficialSelectionFailureToHttp,
  toCompetitionDisputesDto,
  toOfficialSelectionCommandResponse,
  toOfficialSelectionViewDto,
  type TeamOfficialSelectionError,
  type OperatorOfficialSelectionError,
} from "@/http/mappers/official-selection.ts";
import { apiErrorResponse } from "@/http/errors.ts";
import type { ServiceAuthVariables } from "@/http/middleware/service-auth.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  voidOfficialResultRoute,
  confirmOfficialSelectionRoute,
  getOperatorOfficialSelectionRoute,
  getTeamOfficialSelectionRoute,
  listCompetitionDisputesRoute,
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
  organizationId: string,
  encounterId: string,
  body: { expectedVersion: number; commandKey: string },
) {
  return {
    actorId: c.get("actorId"),
    organizationId: asOrganizationId(organizationId),
    encounterId: asEncounterId(encounterId),
    expectedVersion: body.expectedVersion,
    commandKey: body.commandKey,
  };
}

function commandScope(
  c: SecuredContext,
  organizationId: string,
  encounterId: string,
  body: { actingTeamId: string; expectedVersion: number; commandKey: string },
) {
  return {
    ...operatorCommandScope(c, organizationId, encounterId, body),
    actingTeamId: asTeamId(body.actingTeamId),
  };
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

  secured.openapi(listCompetitionDisputesRoute, async (c) => {
    const params = c.req.valid("param");
    const list = await deps.modules.listCompetitionDisputes.execute({
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
    return jsonResponse(toCompetitionDisputesDto(list));
  });

  secured.openapi(reviewMatchDisputeRoute, async (c) => {
    const body = c.req.valid("json");
    const params = c.req.valid("param");
    return operatorCommandResponse(
      await commands.reviewDispute.execute({
        ...operatorCommandScope(c, params.organizationId, params.encounterId, body),
        reason: body.reason,
      }),
    );
  });

  secured.openapi(resolveMatchDisputeRoute, async (c) => {
    const body = c.req.valid("json");
    const params = c.req.valid("param");
    return operatorCommandResponse(
      await commands.resolveDispute.execute({
        ...operatorCommandScope(c, params.organizationId, params.encounterId, body),
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
    const params = c.req.valid("param");
    return commandResponse(
      await commands.propose.execute({
        ...commandScope(c, params.organizationId, params.encounterId, body),
        selections: body.selections,
      }),
    );
  });

  secured.openapi(confirmOfficialSelectionRoute, async (c) => {
    const body = c.req.valid("json");
    const params = c.req.valid("param");
    return commandResponse(
      await commands.confirm.execute({
        ...commandScope(c, params.organizationId, params.encounterId, body),
        proposalId: params.proposalId,
      }),
    );
  });

  secured.openapi(rejectOfficialSelectionRoute, async (c) => {
    const body = c.req.valid("json");
    const params = c.req.valid("param");
    return commandResponse(
      await commands.reject.execute({
        ...commandScope(c, params.organizationId, params.encounterId, body),
        proposalId: params.proposalId,
        reason: body.reason,
      }),
    );
  });

  secured.openapi(proposeAlternativeOfficialSelectionRoute, async (c) => {
    const body = c.req.valid("json");
    const params = c.req.valid("param");
    return commandResponse(
      await commands.proposeAlternative.execute({
        ...commandScope(c, params.organizationId, params.encounterId, body),
        proposalId: params.proposalId,
        selections: body.selections,
        reason: body.reason,
      }),
    );
  });

  secured.openapi(openMatchDisputeRoute, async (c) => {
    const body = c.req.valid("json");
    const params = c.req.valid("param");
    return commandResponse(
      await commands.openDispute.execute({
        ...commandScope(c, params.organizationId, params.encounterId, body),
        reason: body.reason,
      }),
    );
  });

  secured.openapi(voidOfficialResultRoute, async (c) => {
    const { officialResultId } = c.req.valid("param");
    const body = c.req.valid("json");
    const outcome = await deps.modules.voidOfficialResultAndUnproject.execute({
      actorId: c.get("actorId"),
      officialResultId,
      reason: body.reason,
    });
    if (outcome.isErr())
      return failureToHttp(
        outcome.error,
        outcome.error.code === "results.official_result_forbidden" ? 403 : 404,
      );
    const result = outcome.value;
    return jsonResponse({
      id: result.id,
      revision: result.revision,
      status: result.status,
      approvalBasis: result.approvalBasis ?? null,
      proposalId: result.proposalId ?? null,
      approvedAt: result.approvedAt.toISOString(),
    });
  });
  app.route("/", secured);
}
