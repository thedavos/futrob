import { encounterViewSchema, listEncounterCandidatesResponseSchema } from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";
import { jsonResponse, type JsonSerializable } from "@/shared/infrastructure/http/api-response.ts";

/** Resolves the session actor and a product API client that speaks for it. */
export type ConnectProductApi = (request: Request) => Promise<{ readonly client: FutrobClient }>;

type EncounterScope = Readonly<{ organizationId: string; encounterId: string }>;

/** The Encounter page header and slots, read as the session actor. */
export function handleGetEncounterView(
  request: Request,
  scope: EncounterScope,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(async () => {
    const { client } = await connect(request);
    return encounterViewSchema.parse(
      await client.encounters.getView(scope.organizationId, scope.encounterId),
    );
  });
}

/** EA matches that could fill the Encounter's slots; reading them selects nothing. */
export function handleListEncounterCandidates(
  request: Request,
  scope: Readonly<{ encounterId: string }>,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(async () => {
    const { client } = await connect(request);
    return listEncounterCandidatesResponseSchema.parse(
      await client.results.listEncounterCandidates(scope.encounterId),
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
