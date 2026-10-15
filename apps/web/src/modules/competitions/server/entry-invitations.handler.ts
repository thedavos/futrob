import {
  acceptEntryInvitationRequestSchema,
  acceptEntryInvitationResponseSchema,
  entryInvitationLinkResponseSchema,
  entryInvitationPreviewSchema,
  inviteTeamCaptainRequestSchema,
  listMyEntryInvitationsResponseSchema,
  listSentEntryInvitationsResponseSchema,
  publicEntryInvitationLinkSchema,
  searchEntryInviteesQuerySchema,
  searchEntryInviteesResponseSchema,
  sentEntryInvitationSchema,
} from "@futrob/api-contracts";
import type { EntryInvitationTarget, FutrobClient } from "@futrob/sdk";
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

export function handleListSentEntryInvitations(
  request: Request,
  params: CompetitionParams,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(request, connect, async (client) =>
    listSentEntryInvitationsResponseSchema.parse(
      await client.entryInvitations.listSent(params.organizationId, params.competitionId),
    ),
  );
}

export async function handleInviteTeamCaptain(
  request: Request,
  params: CompetitionParams,
  connect: ConnectProductApi,
): Promise<Response> {
  const body = await parseBody(request, inviteTeamCaptainRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(
    request,
    connect,
    async (client) =>
      sentEntryInvitationSchema.parse(
        await client.entryInvitations.invite(
          params.organizationId,
          params.competitionId,
          body.data,
        ),
      ),
    201,
  );
}

export function handleRevokeEntryInvitation(
  request: Request,
  params: CompetitionParams & Readonly<{ invitationId: string }>,
  connect: ConnectProductApi,
): Promise<Response> {
  return respondEmpty(request, connect, (client) =>
    client.entryInvitations.revoke(
      params.organizationId,
      params.competitionId,
      params.invitationId,
    ),
  );
}

export function handleEntryInvitationLink(
  request: Request,
  params: CompetitionParams,
  connect: ConnectProductApi,
  options: Readonly<{ regenerate: boolean }>,
): Promise<Response> {
  return respond(
    request,
    connect,
    async (client) =>
      entryInvitationLinkResponseSchema.parse(
        options.regenerate
          ? await client.entryInvitations.regenerateLink(
              params.organizationId,
              params.competitionId,
            )
          : await client.entryInvitations.getLink(params.organizationId, params.competitionId),
      ),
    options.regenerate ? 201 : 200,
  );
}

export function handleSearchEntryInvitees(
  request: Request,
  params: CompetitionParams,
  connect: ConnectProductApi,
): Promise<Response> {
  const query = searchEntryInviteesQuerySchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!query.success) return Promise.resolve(validationError(query.error));
  return respond(request, connect, async (client) =>
    searchEntryInviteesResponseSchema.parse(
      await client.entryInvitations.searchInvitees(
        params.organizationId,
        params.competitionId,
        query.data.q,
      ),
    ),
  );
}

export function handleListMyEntryInvitations(
  request: Request,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(request, connect, async (client) =>
    listMyEntryInvitationsResponseSchema.parse(await client.entryInvitations.listMine()),
  );
}

export function handlePreviewEntryInvitation(
  request: Request,
  target: EntryInvitationTarget,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(request, connect, async (client) =>
    entryInvitationPreviewSchema.parse(await client.entryInvitations.preview(target)),
  );
}

/** Signed-out preview of a link; `connect` supplies an actor-free client. */
export function handlePublicEntryInvitationLink(
  request: Request,
  code: string,
  connect: ConnectProductApi,
): Promise<Response> {
  return respond(request, connect, async (client) =>
    publicEntryInvitationLinkSchema.parse(await client.entryInvitations.previewPublicLink(code)),
  );
}

export async function handleAcceptEntryInvitation(
  request: Request,
  target: EntryInvitationTarget,
  connect: ConnectProductApi,
): Promise<Response> {
  const body = await parseBody(request, acceptEntryInvitationRequestSchema);
  if (!body.success) return validationError(body.error);
  return respond(
    request,
    connect,
    async (client) =>
      acceptEntryInvitationResponseSchema.parse(
        await client.entryInvitations.accept(target, body.data),
      ),
    201,
  );
}

export function handleDeclineEntryInvitation(
  request: Request,
  params: Readonly<{ invitationId: string }>,
  connect: ConnectProductApi,
): Promise<Response> {
  return respondEmpty(request, connect, (client) =>
    client.entryInvitations.decline(params.invitationId),
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

async function respondEmpty(
  request: Request,
  connect: ConnectProductApi,
  send: (client: FutrobClient) => Promise<void>,
): Promise<Response> {
  try {
    const { client } = await connect(request);
    await send(client);
    return new Response(null, { status: 204 });
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
