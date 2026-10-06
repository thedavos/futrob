import {
  acceptScheduleChangeProposalRequestSchema,
  counterScheduleChangeProposalRequestSchema,
  createScheduleChangeRequestSchema,
  listScheduleChangeRequestsResponseSchema,
  rejectScheduleChangeProposalRequestSchema,
  scheduleChangeCommandResponseSchema,
  scheduleChangeRequestSchema,
  type ScheduleChangeCommandResponse,
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

type EncounterParams = Readonly<{ encounterId: string }>;
type RequestParams = EncounterParams & Readonly<{ requestId: string }>;
type ProposalCommandParams = RequestParams & Readonly<{ proposalId: string; command: string }>;

export function handleListScheduleChangeRequests(
  request: Request,
  params: EncounterParams,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(async () => {
    const { client } = await connect(request);
    return listScheduleChangeRequestsResponseSchema.parse(
      await client.encounters.listScheduleChangeRequests(params.encounterId),
    );
  });
}

export async function handleCreateScheduleChangeRequest(
  request: Request,
  params: EncounterParams,
  connect: ConnectProductApi,
): Promise<Response> {
  const body = await parseBody(request, createScheduleChangeRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(async () => {
    const { client } = await connect(request);
    return scheduleChangeRequestSchema.parse(
      await client.encounters.createScheduleChangeRequest(params.encounterId, body.data),
    );
  });
}

export function handleGetScheduleChangeRequest(
  request: Request,
  params: RequestParams,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(async () => {
    const { client } = await connect(request);
    return scheduleChangeRequestSchema.parse(
      await client.encounters.getScheduleChangeRequest(params.encounterId, params.requestId),
    );
  });
}

/**
 * Accept, reject or counter the proposal named in the path. The body is forwarded as
 * parsed, so `commandKey` and `expectedVersion` reach the API unchanged; the actor is
 * the session's, whatever the body claims.
 */
export async function handleScheduleChangeProposalCommand(
  request: Request,
  params: ProposalCommandParams,
  connect: ConnectProductApi,
): Promise<Response> {
  const target = {
    encounterId: params.encounterId,
    requestId: params.requestId,
    proposalId: params.proposalId,
  };
  switch (params.command) {
    case "accept": {
      const body = await parseBody(request, acceptScheduleChangeProposalRequestSchema);
      if (!body.success) return validationError(body.error);
      return respondToCommand(request, connect, (client) =>
        client.encounters.acceptScheduleChangeProposal(target, body.data),
      );
    }
    case "reject": {
      const body = await parseBody(request, rejectScheduleChangeProposalRequestSchema);
      if (!body.success) return validationError(body.error);
      return respondToCommand(request, connect, (client) =>
        client.encounters.rejectScheduleChangeProposal(target, body.data),
      );
    }
    case "counter": {
      const body = await parseBody(request, counterScheduleChangeProposalRequestSchema);
      if (!body.success) return validationError(body.error);
      return respondToCommand(request, connect, (client) =>
        client.encounters.counterScheduleChangeProposal(target, body.data),
      );
    }
    default:
      return apiErrorResponse(404, { code: "api.not_found", messageKey: "errors.api.not_found" });
  }
}

function respondToCommand(
  request: Request,
  connect: ConnectProductApi,
  send: (client: FutrobClient) => Promise<ScheduleChangeCommandResponse>,
): Promise<Response> {
  return respond(async () => {
    const { client } = await connect(request);
    return scheduleChangeCommandResponseSchema.parse(await send(client));
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
