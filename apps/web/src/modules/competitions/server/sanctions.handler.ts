import {
  competitionSanctionSchema,
  imposeSanctionRequestSchema,
  listCompetitionSanctionsResponseSchema,
  revokeSanctionRequestSchema,
} from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";
import type { z } from "zod";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";
import {
  apiErrorResponse,
  jsonResponse,
  type JsonSerializable,
} from "@/shared/infrastructure/http/api-response.ts";

/** Resolves the session actor and a product API client that speaks for it. */
export type ConnectProductApi = (request: Request) => Promise<{ readonly client: FutrobClient }>;

type CompetitionParams = Readonly<{ organizationId: string; competitionId: string }>;

/**
 * Sanctions BFF (ADR-0028). The product API decides who may read, impose or revoke;
 * this layer only forwards as the session actor and validates the browser body.
 */
export function handleListCompetitionSanctions(
  request: Request,
  params: CompetitionParams,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(request, connect, async (client) =>
    listCompetitionSanctionsResponseSchema.parse(
      await client.sanctions.list(params.organizationId, params.competitionId),
    ),
  );
}

export function handleListTeamSanctions(
  request: Request,
  params: CompetitionParams & Readonly<{ teamId: string }>,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(request, connect, async (client) =>
    listCompetitionSanctionsResponseSchema.parse(
      await client.sanctions.listForTeam(
        params.organizationId,
        params.competitionId,
        params.teamId,
      ),
    ),
  );
}

export async function handleImposeSanction(
  request: Request,
  params: CompetitionParams,
  connect: ConnectProductApi,
): Promise<Response> {
  const body = await parseBody(request, imposeSanctionRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(
    request,
    connect,
    async (client) =>
      competitionSanctionSchema.parse(
        await client.sanctions.impose(params.organizationId, params.competitionId, body.data),
      ),
    201,
  );
}

export async function handleRevokeSanction(
  request: Request,
  params: CompetitionParams & Readonly<{ sanctionId: string }>,
  connect: ConnectProductApi,
): Promise<Response> {
  const body = await parseBody(request, revokeSanctionRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(request, connect, async (client) =>
    competitionSanctionSchema.parse(
      await client.sanctions.revoke(
        params.organizationId,
        params.competitionId,
        params.sanctionId,
        body.data,
      ),
    ),
  );
}

async function respond(
  request: Request,
  connect: ConnectProductApi,
  load: (client: FutrobClient) => Promise<JsonSerializable>,
  status = 200,
): Promise<Response> {
  try {
    const { client } = await connect(request);
    return jsonResponse(await load(client), status);
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}

async function parseBody<Body>(
  request: Request,
  schema: z.ZodType<Body>,
): Promise<z.ZodSafeParseResult<Body>> {
  return schema.safeParse(await request.json().catch(() => null));
}

function validationError(error: z.ZodError): Response {
  return apiErrorResponse(400, {
    code: "api.validation_error",
    messageKey: "errors.api.validation_error",
    details: { issues: error.issues },
  });
}
