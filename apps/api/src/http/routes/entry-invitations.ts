import {
  acceptEntryInvitationResponseSchema,
  entryInvitationLinkResponseSchema,
  entryInvitationPreviewSchema,
  listMyEntryInvitationsResponseSchema,
  listSentEntryInvitationsResponseSchema,
  searchEntryInviteesResponseSchema,
  sentEntryInvitationSchema,
} from "@futrob/api-contracts";
import {
  COMPETITION_PERMISSION,
  type EntryInvitation,
  type EntryInvitationReference,
} from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId, type ActorId } from "@futrob/shared-kernel";
import { type Context, type Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp } from "@/http/errors.ts";
import { competitionApplicationDto } from "@/http/mappers/competition-entry.ts";
import type { ServiceAuthVariables } from "@/http/middleware/service-auth.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  acceptEntryInvitationLinkRoute,
  acceptEntryInvitationRoute,
  declineEntryInvitationRoute,
  ensureEntryInvitationLinkRoute,
  inviteTeamCaptainRoute,
  listMyEntryInvitationsRoute,
  listSentEntryInvitationsRoute,
  previewEntryInvitationLinkRoute,
  previewEntryInvitationRoute,
  regenerateEntryInvitationLinkRoute,
  revokeEntryInvitationRoute,
  searchEntryInviteesRoute,
} from "@/http/openapi/routes/entry-invitations.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";
import { jsonResponse } from "@/utils/http-response.ts";

type SecuredContext = Context<{ Variables: ServiceAuthVariables }>;

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function sentDto(invitation: EntryInvitation) {
  return {
    id: invitation.id,
    inviteeActorId: invitation.inviteeActorId ?? "",
    inviteeLabel: invitation.inviteeLabel,
    message: invitation.message,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: iso(invitation.expiresAt),
    respondedAt: iso(invitation.respondedAt),
    acceptedEntryId: invitation.acceptedEntryId,
  };
}

function linkDto(invitation: EntryInvitation) {
  return {
    link: {
      id: invitation.id,
      code: invitation.code ?? "",
      createdAt: invitation.createdAt.toISOString(),
    },
  };
}

/**
 * Entry invitations (ADR-0023). Organizer routes live under the competition and require
 * `competitions.invitations.manage`; the invited player answers by id (directed) or by
 * the link code.
 */
export function registerEntryInvitationRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);
  const { competitions, entryInvitations, teams } = deps.modules;
  const useCases = competitions.entryInvitations;

  function scope(c: SecuredContext, params: Record<string, string>) {
    return {
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId ?? ""),
      competitionId: asCompetitionId(params.competitionId ?? ""),
    };
  }

  secured.openapi(listSentEntryInvitationsRoute, async (c) => {
    const result = await useCases.listSent.execute(scope(c, c.req.valid("param")));
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listSentEntryInvitationsResponseSchema.parse({ invitations: result.value.map(sentDto) }),
    );
  });

  secured.openapi(inviteTeamCaptainRoute, async (c) => {
    const body = c.req.valid("json");
    const inviteeActorId = asActorId(body.inviteeActorId);
    if (!(await teams.repositories.profiles.findByActor(inviteeActorId))) {
      return apiErrorResponse(404, {
        code: "competitions.entry_invitee_not_found",
        messageKey: "errors.competitions.entry_invitee_not_found",
      });
    }
    const result = await entryInvitations.commands.invite.execute({
      ...scope(c, c.req.valid("param")),
      inviteeActorId,
      inviteeLabel: body.inviteeLabel,
      message: body.message,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(sentEntryInvitationSchema.parse(sentDto(result.value)), 201);
  });

  secured.openapi(revokeEntryInvitationRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await entryInvitations.commands.revoke.execute({
      ...scope(c, params),
      invitationId: params.invitationId,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  secured.openapi(ensureEntryInvitationLinkRoute, async (c) => {
    const result = await deps.modules.transaction.runInTransaction(() =>
      useCases.ensureLink.execute(scope(c, c.req.valid("param"))),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(entryInvitationLinkResponseSchema.parse(linkDto(result.value)));
  });

  secured.openapi(regenerateEntryInvitationLinkRoute, async (c) => {
    const result = await deps.modules.transaction.runInTransaction(() =>
      useCases.regenerateLink.execute(scope(c, c.req.valid("param"))),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(entryInvitationLinkResponseSchema.parse(linkDto(result.value)), 201);
  });

  secured.openapi(searchEntryInviteesRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, competitionId, actorId } = scope(c, c.req.valid("param"));
    const forbidden = await requireApiPermission(deps, {
      actorId,
      permission: COMPETITION_PERMISSION.invitationsManage,
      scope: { organizationId, competitionId },
    });
    if (forbidden) return forbidden;
    const found = await teams.searchPlayers.execute({ query: query.q });
    if (!found.isOk()) return failureToHttp(found.error);
    const players = await Promise.all(
      found.value.map(async (player) => ({
        ...player,
        inCompetition: await inCompetition(player.actorId, competitionId),
        invitationPending:
          (await useCases.repository.findPendingDirected(
            organizationId,
            competitionId,
            player.actorId,
          )) !== null,
      })),
    );
    return jsonResponse(searchEntryInviteesResponseSchema.parse({ players }));
  });

  async function inCompetition(actorId: ActorId, competitionId: string): Promise<boolean> {
    const profile = await teams.repositories.profiles.findByActor(actorId);
    if (!profile) return false;
    return (
      (await teams.repositories.rosters.findByPlayerAndCompetition(
        profile.id,
        asCompetitionId(competitionId),
      )) !== null
    );
  }

  secured.openapi(listMyEntryInvitationsRoute, async (c) => {
    const invitations = await useCases.listMine.execute({ actorId: c.get("actorId") });
    const items = await Promise.all(
      invitations.map(async (invitation) => {
        const draft = await competitions.repository.findById(
          invitation.organizationId,
          invitation.competitionId,
        );
        if (!draft) return null;
        return {
          id: invitation.id,
          status: invitation.status,
          message: invitation.message,
          createdAt: invitation.createdAt.toISOString(),
          expiresAt: iso(invitation.expiresAt),
          competition: {
            id: draft.competition.id,
            organizationId: draft.competition.organizationId,
            name: draft.competition.name,
            platform: draft.competition.platform,
            gameEdition: draft.competition.gameEdition,
          },
        };
      }),
    );
    return jsonResponse(
      listMyEntryInvitationsResponseSchema.parse({
        invitations: items.filter((item) => item !== null),
      }),
    );
  });

  async function preview(c: SecuredContext, reference: EntryInvitationReference) {
    const result = await entryInvitations.acceptance.preview({
      actorId: c.get("actorId"),
      reference,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    const { invitation, competition, organizationName, suggestedTeamName, existing } = result.value;
    return jsonResponse(
      entryInvitationPreviewSchema.parse({
        invitation: {
          id: invitation.id,
          channel: invitation.channel,
          status: invitation.status,
          message: invitation.message,
          expiresAt: iso(invitation.expiresAt),
        },
        competition: {
          id: competition.competition.id,
          organizationId: competition.competition.organizationId,
          organizationName,
          name: competition.competition.name,
          platform: competition.competition.platform,
          gameEdition: competition.competition.gameEdition,
          status: competition.competition.status,
        },
        suggestedTeamName,
        existing: existing ? competitionApplicationDto(existing) : null,
      }),
    );
  }

  async function accept(
    c: SecuredContext,
    reference: EntryInvitationReference,
    body: { teamName: string; creationKey: string },
  ) {
    const result = await entryInvitations.acceptance.accept({
      actorId: c.get("actorId"),
      reference,
      teamName: body.teamName,
      creationKey: body.creationKey,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      acceptEntryInvitationResponseSchema.parse({
        organizationId: result.value.entry.organizationId,
        competitionId: result.value.entry.competitionId,
        application: competitionApplicationDto(result.value),
      }),
      201,
    );
  }

  secured.openapi(previewEntryInvitationRoute, async (c) =>
    preview(c, { invitationId: c.req.valid("param").invitationId }),
  );
  secured.openapi(acceptEntryInvitationRoute, async (c) =>
    accept(c, { invitationId: c.req.valid("param").invitationId }, c.req.valid("json")),
  );
  secured.openapi(previewEntryInvitationLinkRoute, async (c) =>
    preview(c, { code: c.req.valid("param").code }),
  );
  secured.openapi(acceptEntryInvitationLinkRoute, async (c) =>
    accept(c, { code: c.req.valid("param").code }, c.req.valid("json")),
  );
  secured.openapi(declineEntryInvitationRoute, async (c) => {
    const result = await entryInvitations.commands.decline.execute({
      actorId: c.get("actorId"),
      invitationId: c.req.valid("param").invitationId,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  app.route("/", secured);
}
