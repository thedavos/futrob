import { Hono } from "hono";
import {
  acceptEntryInvitationRequestSchema,
  acceptEntryInvitationResponseSchema,
  entryInvitationLinkResponseSchema,
  entryInvitationPreviewSchema,
  inviteTeamCaptainRequestSchema,
  listMyEntryInvitationsResponseSchema,
  listSentEntryInvitationsResponseSchema,
  searchEntryInviteesQuerySchema,
  searchEntryInviteesResponseSchema,
  sentEntryInvitationSchema,
} from "@futrob/api-contracts";
import {
  COMPETITION_PERMISSION,
  type EntryInvitation,
  type EntryInvitationReference,
} from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId, type ActorId } from "@futrob/shared-kernel";
import type { Context } from "hono";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { competitionApplicationDto } from "@/http/mappers/competition-entry.ts";
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
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));
  const { competitions, entryInvitations, teams } = deps.modules;
  const useCases = competitions.entryInvitations;
  const base = "/organizations/:organizationId/competitions/:competitionId/entry-invitations";

  function scope(c: SecuredContext) {
    return {
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.param("organizationId") ?? ""),
      competitionId: asCompetitionId(c.req.param("competitionId") ?? ""),
    };
  }

  secured.get(base, async (c) => {
    const result = await useCases.listSent.execute(scope(c));
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listSentEntryInvitationsResponseSchema.parse({ invitations: result.value.map(sentDto) }),
    );
  });

  secured.post(base, async (c) => {
    const parsed = inviteTeamCaptainRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const inviteeActorId = asActorId(parsed.data.inviteeActorId);
    if (!(await teams.repositories.profiles.findByActor(inviteeActorId))) {
      return apiErrorResponse(404, {
        code: "competitions.entry_invitee_not_found",
        messageKey: "errors.competitions.entry_invitee_not_found",
      });
    }
    const result = await entryInvitations.commands.invite.execute({
      ...scope(c),
      inviteeActorId,
      inviteeLabel: parsed.data.inviteeLabel,
      message: parsed.data.message,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(sentEntryInvitationSchema.parse(sentDto(result.value)), 201);
  });

  secured.delete(`${base}/:invitationId`, async (c) => {
    const result = await entryInvitations.commands.revoke.execute({
      ...scope(c),
      invitationId: c.req.param("invitationId"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  secured.post(`${base}/link`, async (c) => {
    const result = await deps.modules.transaction.runInTransaction(() =>
      useCases.ensureLink.execute(scope(c)),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(entryInvitationLinkResponseSchema.parse(linkDto(result.value)));
  });

  secured.post(`${base}/link/regenerate`, async (c) => {
    const result = await deps.modules.transaction.runInTransaction(() =>
      useCases.regenerateLink.execute(scope(c)),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(entryInvitationLinkResponseSchema.parse(linkDto(result.value)), 201);
  });

  secured.get(`${base}/candidates`, async (c) => {
    const parsed = searchEntryInviteesQuerySchema.safeParse(c.req.query());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const { organizationId, competitionId, actorId } = scope(c);
    const forbidden = await requireApiPermission(deps, {
      actorId,
      permission: COMPETITION_PERMISSION.invitationsManage,
      scope: { organizationId, competitionId },
    });
    if (forbidden) return forbidden;
    const found = await teams.searchPlayers.execute({ query: parsed.data.q });
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

  secured.get("/players/me/entry-invitations", async (c) => {
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

  function reference(c: SecuredContext): EntryInvitationReference {
    const code = c.req.param("code");
    return code ? { code } : { invitationId: c.req.param("invitationId") ?? "" };
  }

  async function preview(c: SecuredContext) {
    const result = await entryInvitations.acceptance.preview({
      actorId: c.get("actorId"),
      reference: reference(c),
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

  async function accept(c: SecuredContext) {
    const parsed = acceptEntryInvitationRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await entryInvitations.acceptance.accept({
      actorId: c.get("actorId"),
      reference: reference(c),
      teamName: parsed.data.teamName,
      creationKey: parsed.data.creationKey,
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

  secured.get("/entry-invitations/links/:code", preview);
  secured.post("/entry-invitations/links/:code/accept", accept);
  secured.get("/entry-invitations/:invitationId", preview);
  secured.post("/entry-invitations/:invitationId/accept", accept);
  secured.post("/entry-invitations/:invitationId/decline", async (c) => {
    const result = await entryInvitations.commands.decline.execute({
      actorId: c.get("actorId"),
      invitationId: c.req.param("invitationId"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  app.route("/", secured);
}
