import {
  reviewMatchDisputeRequestSchema,
  resolveMatchDisputeRequestSchema,
  getTeamOfficialSelectionQuerySchema,
  proposeOfficialSelectionRequestSchema,
  confirmOfficialSelectionRequestSchema,
  rejectOfficialSelectionRequestSchema,
  proposeAlternativeOfficialSelectionRequestSchema,
  openMatchDisputeRequestSchema,
} from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";
import type { z } from "zod";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  type JsonSerializable,
} from "@/shared/infrastructure/http/api-response.ts";
import { createBffRequestCorrelation } from "@/shared/infrastructure/http/request-correlation.ts";

type SelectionScope = { organizationId: string; encounterId: string };
type ProposalScope = SelectionScope & { proposalId: string };

async function selectionRequest(
  request: Request,
  execute: (client: FutrobClient) => Promise<Response>,
): Promise<Response> {
  const { requestId } = createBffRequestCorrelation(request);
  try {
    const { client } = await createAuthenticatedProductApiClient(request, requestId);
    const response = await execute(client);
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    return error instanceof Error
      ? productApiBffErrorResponseForError(error, requestId)
      : productApiBffErrorResponse({ kind: "unexpected" }, requestId);
  }
}

function invalidRequest(request: Request) {
  return apiErrorResponse(
    400,
    {
      code: "api.validation_error",
      messageKey: "errors.api.validation_error",
    },
    createBffRequestCorrelation(request).requestId,
  );
}

function selectionCommand<Input>(
  request: Request,
  schema: z.ZodType<Input>,
  execute: (client: FutrobClient, input: Input) => Promise<JsonSerializable>,
): Promise<Response> {
  return selectionRequest(request, async (client) => {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return invalidRequest(request);
    return jsonResponse(await execute(client, parsed.data));
  });
}

export function getTeamOfficialSelection(request: Request, scope: SelectionScope) {
  return selectionRequest(request, async (client) => {
    const query = getTeamOfficialSelectionQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) return invalidRequest(request);
    return jsonResponse(
      await client.results.getTeamOfficialSelection(
        scope.organizationId,
        scope.encounterId,
        query.data,
      ),
    );
  });
}

export function proposeOfficialSelection(request: Request, scope: SelectionScope) {
  return selectionCommand(request, proposeOfficialSelectionRequestSchema, (client, input) =>
    client.results.proposeOfficialSelection(scope.organizationId, scope.encounterId, input),
  );
}

export function confirmOfficialSelection(request: Request, scope: ProposalScope) {
  return selectionCommand(request, confirmOfficialSelectionRequestSchema, (client, input) =>
    client.results.confirmOfficialSelection(
      scope.organizationId,
      scope.encounterId,
      scope.proposalId,
      input,
    ),
  );
}

export function rejectOfficialSelection(request: Request, scope: ProposalScope) {
  return selectionCommand(request, rejectOfficialSelectionRequestSchema, (client, input) =>
    client.results.rejectOfficialSelection(
      scope.organizationId,
      scope.encounterId,
      scope.proposalId,
      input,
    ),
  );
}

export function proposeAlternativeOfficialSelection(request: Request, scope: ProposalScope) {
  return selectionCommand(
    request,
    proposeAlternativeOfficialSelectionRequestSchema,
    (client, input) =>
      client.results.proposeAlternativeOfficialSelection(
        scope.organizationId,
        scope.encounterId,
        scope.proposalId,
        input,
      ),
  );
}

export function openMatchDispute(request: Request, scope: SelectionScope) {
  return selectionCommand(request, openMatchDisputeRequestSchema, (client, input) =>
    client.results.openMatchDispute(scope.organizationId, scope.encounterId, input),
  );
}

export function getOperatorOfficialSelection(request: Request, scope: SelectionScope) {
  return selectionRequest(request, async (client) =>
    jsonResponse(
      await client.results.getOperatorOfficialSelection(scope.organizationId, scope.encounterId),
    ),
  );
}

export function reviewMatchDispute(request: Request, scope: SelectionScope) {
  return selectionCommand(request, reviewMatchDisputeRequestSchema, (client, input) =>
    client.results.reviewMatchDispute(scope.organizationId, scope.encounterId, input),
  );
}

export function resolveMatchDispute(request: Request, scope: SelectionScope) {
  return selectionCommand(request, resolveMatchDisputeRequestSchema, (client, input) =>
    client.results.resolveMatchDispute(scope.organizationId, scope.encounterId, input),
  );
}
