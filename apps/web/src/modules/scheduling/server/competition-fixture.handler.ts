import { getCurrentCompetitionFixtureResponseSchema } from "@futrob/api-contracts";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import type { ConnectProductApi } from "./schedule-change-requests.handler.ts";

/** The competition's current fixture and its Team names, read as the session actor. */
export async function handleGetCurrentCompetitionFixture(
  request: Request,
  scope: Readonly<{ organizationId: string; competitionId: string }>,
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
