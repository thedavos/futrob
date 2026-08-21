import { Hono } from "hono";
import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
  createCompetitionInvitationRequestSchema,
  createInvitationResponseSchema,
  competitionParticipantInputSchema,
  listCompetitionParticipantsResponseSchema,
  addCompetitionParticipantResponseSchema,
  publishCompetitionResponseSchema,
  registerTeamEntryRequestSchema,
  registerTeamEntryResponseSchema,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { competitionDraftDto } from "@/http/mappers/competition.ts";
import { competitionEntryDto } from "@/http/mappers/competition-entry.ts";
import { jsonResponse } from "@/utils/http-response.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";

export function registerCompetitionParticipantRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/participants",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const forbidden = await requireApiPermission(deps, {
        actorId: c.get("actorId"),
        permission: COMPETITION_PERMISSION.participantsRead,
        scope: { organizationId, competitionId },
      });
      if (forbidden) return forbidden;
      const participants = await deps.modules.competitions.listParticipants.execute({
        organizationId,
        competitionId,
      });
      return jsonResponse(
        listCompetitionParticipantsResponseSchema.parse({
          participants: participants.map(competitionEntryDto),
        }),
      );
    },
  );

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/participants",
    async (c) => {
      const parsed = competitionParticipantInputSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const forbidden = await requireApiPermission(deps, {
        actorId: c.get("actorId"),
        permission: COMPETITION_PERMISSION.participantsManage,
        scope: { organizationId, competitionId },
      });
      if (forbidden) return forbidden;
      const result = await deps.modules.transaction.runInTransaction(async () => {
        if (parsed.data.kind === "existing-team") {
          const team = await deps.modules.teams.getTeam.execute({
            organizationId,
            teamId: asTeamId(parsed.data.teamId),
          });
          if (!team) return null;
          return deps.modules.competitions.registerTeamEntry.execute({
            actorId: c.get("actorId"),
            organizationId,
            competitionId,
            teamId: team.id,
            approved: true,
          });
        }
        const team = await deps.modules.teams.createTeam.execute({
          organizationId,
          actorId: c.get("actorId"),
          name: parsed.data.name,
          creationKey: parsed.data.creationKey,
        });
        if (!team.isOk()) return team;
        return deps.modules.competitions.registerTeamEntry.execute({
          actorId: c.get("actorId"),
          organizationId,
          competitionId,
          teamId: team.value.id,
          creationKey: `${competitionId}:${parsed.data.creationKey}`,
          approved: true,
        });
      });
      if (!result)
        return apiErrorResponse(404, {
          code: "teams.not_found",
          messageKey: "errors.teams.not_found",
        });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(
        addCompetitionParticipantResponseSchema.parse(competitionEntryDto(result.value)),
        201,
      );
    },
  );

  secured.delete(
    "/organizations/:organizationId/competitions/:competitionId/participants/:entryId",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const result = await deps.modules.competitions.removeParticipant.execute({
        actorId: c.get("actorId"),
        organizationId,
        competitionId,
        entryId: c.req.param("entryId"),
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return new Response(null, { status: 204 });
    },
  );

  secured.post("/organizations/:organizationId/competitions/:competitionId/publish", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const competitionId = asCompetitionId(c.req.param("competitionId"));
    const result = await deps.modules.transaction.runInTransaction(() =>
      deps.modules.competitions.publish.execute({
        actorId: c.get("actorId"),
        organizationId,
        competitionId,
      }),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(publishCompetitionResponseSchema.parse(competitionDraftDto(result.value)));
  });

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/invitations",
    async (c) => {
      const parsed = createCompetitionInvitationRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const forbidden = await requireApiPermission(deps, {
        actorId: c.get("actorId"),
        permission: COMPETITION_PERMISSION.invitationsManage,
        scope: { organizationId, competitionId },
      });
      if (forbidden) return forbidden;
      const draft = await deps.modules.competitions.getDraft.execute({
        organizationId,
        competitionId,
      });
      if (!draft) {
        return apiErrorResponse(404, {
          code: "competitions.not_found",
          messageKey: "errors.competitions.not_found",
        });
      }
      const result = await deps.modules.organizations.createInvitation.execute({
        organizationId,
        competitionId,
        role: parsed.data.role,
        invitedByActorId: c.get("actorId"),
        email: parsed.data.email,
        expiresInMs: parsed.data.expiresInMs,
        redeemPolicy: parsed.data.redeemPolicy,
        maxRedemptions: parsed.data.maxRedemptions,
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(
        createInvitationResponseSchema.parse({
          ...result.value,
          competitionId,
          expiresAt: result.value.expiresAt.toISOString(),
        }),
        201,
      );
    },
  );

  secured.post("/organizations/:organizationId/competitions/:competitionId/entries", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const competitionId = asCompetitionId(c.req.param("competitionId"));
    const parsed = registerTeamEntryRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const team = await deps.modules.teams.getTeam.execute({
      organizationId,
      teamId: asTeamId(parsed.data.teamId),
    });
    if (!team) {
      return apiErrorResponse(404, {
        code: "teams.not_found",
        messageKey: "errors.teams.not_found",
      });
    }

    const result = await deps.modules.competitions.registerTeamEntry.execute({
      actorId: c.get("actorId"),
      organizationId,
      competitionId,
      teamId: team.id,
      creationKey: parsed.data.creationKey,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      registerTeamEntryResponseSchema.parse(competitionEntryDto(result.value)),
      201,
    );
  });

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/entries/:entryId/approve",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const result = await deps.modules.competitions.approveTeamEntry.execute({
        actorId: c.get("actorId"),
        organizationId,
        competitionId,
        entryId: c.req.param("entryId"),
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(registerTeamEntryResponseSchema.parse(competitionEntryDto(result.value)));
    },
  );

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/entries/:entryId/reject",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const result = await deps.modules.competitions.rejectTeamEntry.execute({
        actorId: c.get("actorId"),
        organizationId,
        competitionId,
        entryId: c.req.param("entryId"),
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(registerTeamEntryResponseSchema.parse(competitionEntryDto(result.value)));
    },
  );

  secured.post("/competitions/invitations/accept", async (c) => {
    const parsed = acceptInvitationRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const actorId = c.get("actorId");
    const accepted = await deps.modules.organizations.acceptInvitation.execute({
      token: parsed.data.token,
      actorId,
      requireCompetition: true,
    });
    if (!accepted.isOk()) return failureToHttp(accepted.error);

    const competitionId = accepted.value.competitionId!;
    // Join before reading the draft: join validates the competition exists, so
    // a missing draft can no longer strand an accepted invitation behind a
    // permanent 404. Both operations are idempotent, so a transient failure
    // after acceptance heals on retry.
    const joined = await deps.modules.competitions.join.execute({
      organizationId: accepted.value.organizationId,
      competitionId,
      actorId,
      role: accepted.value.competitionRole!,
    });
    if (!joined.isOk()) return failureToHttp(joined.error);

    const draft = await deps.modules.competitions.getDraft.execute({
      organizationId: accepted.value.organizationId,
      competitionId,
    });
    if (!draft) {
      // Competition vanished between join and read; signal retryable instead
      // of a permanent 404 now that the actor is already a member.
      return apiErrorResponse(503, {
        code: "competitions.not_found",
        messageKey: "errors.competitions.not_found",
      });
    }

    return jsonResponse(
      acceptCompetitionInvitationResponseSchema.parse({
        ...accepted.value,
        competitionName: draft.competition.name,
        destination: {
          kind: "competition",
          organizationId: accepted.value.organizationId,
          competitionId,
        },
      }),
    );
  });

  app.route("/", secured);
}
