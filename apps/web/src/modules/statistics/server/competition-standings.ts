import { getCompetitionStandingsResponseSchema } from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

/** Resolves the session actor and a product API client that speaks for it. */
export type ConnectProductApi = (request: Request) => Promise<{ readonly client: FutrobClient }>;

/**
 * The official standings snapshot, read as the session actor. `standings: null` is the
 * product API's «nothing projected yet»; refusals and failures keep their own status.
 */
export async function handleGetCompetitionStandings(
  request: Request,
  scope: Readonly<{ organizationId: string; competitionId: string }>,
  connect: ConnectProductApi,
): Promise<Response> {
  try {
    const { client } = await connect(request);
    return jsonResponse(
      getCompetitionStandingsResponseSchema.parse(
        await client.statistics.getCompetitionStandings(scope),
      ),
    );
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}
