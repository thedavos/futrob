import {
  closeSwissRoundRequestSchema,
  fixturePlanSchema,
  generateCompetitionFixtureRequestSchema,
  getCurrentCompetitionFixtureResponseSchema,
  withdrawSwissTeamRequestSchema,
} from "@futrob/api-contracts";
import { z } from "zod";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";
import {
  apiErrorResponse,
  jsonResponse,
  type JsonSerializable,
} from "@/shared/infrastructure/http/api-response.ts";
import type { ConnectProductApi } from "./schedule-change-requests.handler.ts";

type CompetitionScope = Readonly<{ organizationId: string; competitionId: string }>;
type FixtureScope = CompetitionScope & Readonly<{ fixturePlanId: string }>;

/** The competition's current fixture and its Team names, read as the session actor. */
export async function handleGetCurrentCompetitionFixture(
  request: Request,
  scope: CompetitionScope,
  connect: ConnectProductApi,
): Promise<Response> {
  try {
    const { client } = await connect(request);
    return jsonResponse(
      getCurrentCompetitionFixtureResponseSchema.parse(
        await client.encounters.getCurrentFixture(scope.organizationId, scope.competitionId),
      ),
    );
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}

/** First or replayed generation; the product API owns the format, plan and status checks. */
export async function handleGenerateCompetitionFixture(
  request: Request,
  scope: CompetitionScope,
  connect: ConnectProductApi,
): Promise<Response> {
  const body = await parseBody(request, generateCompetitionFixtureRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(async () => {
    const { client } = await connect(request);
    return fixturePlanSchema.parse(
      await client.encounters.generateFixture(scope.organizationId, scope.competitionId, body.data),
    );
  });
}

/** The body is forwarded as parsed, so `requestId` reaches the API and a retry replays. */
export async function handleWithdrawSwissTeam(
  request: Request,
  scope: FixtureScope,
  connect: ConnectProductApi,
): Promise<Response> {
  const body = await parseBody(request, withdrawSwissTeamRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(async () => {
    const { client } = await connect(request);
    return fixturePlanSchema.parse(
      await client.encounters.withdrawSwissTeam(
        scope.organizationId,
        scope.competitionId,
        scope.fixturePlanId,
        body.data,
      ),
    );
  });
}

const roundNumberSchema = z.coerce.number().int().positive();

export async function handleCloseSwissRound(
  request: Request,
  scope: FixtureScope & Readonly<{ roundNumber: string }>,
  connect: ConnectProductApi,
): Promise<Response> {
  const roundNumber = roundNumberSchema.safeParse(scope.roundNumber);
  if (!roundNumber.success) return validationError(roundNumber.error);
  const body = await parseBody(request, closeSwissRoundRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(async () => {
    const { client } = await connect(request);
    return fixturePlanSchema.parse(
      await client.encounters.closeSwissRound(
        scope.organizationId,
        scope.competitionId,
        scope.fixturePlanId,
        roundNumber.data,
        body.data,
      ),
    );
  });
}

async function respond(load: () => Promise<JsonSerializable>): Promise<Response> {
  try {
    return jsonResponse(await load());
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
