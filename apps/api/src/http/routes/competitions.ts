import { Hono } from "hono";
import {
  acceptCompetitionInvitationResponseSchema,
  acceptInvitationRequestSchema,
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  getCompetitionDraftResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  registerTeamEntryRequestSchema,
  registerTeamEntryResponseSchema,
  updateCompetitionDraftRequestSchema,
  updateCompetitionDraftResponseSchema,
  competitionParticipantInputSchema,
  listCompetitionParticipantsResponseSchema,
  addCompetitionParticipantResponseSchema,
  publishCompetitionResponseSchema,
  listOrganizationTeamsResponseSchema,
} from "@futrob/api-contracts";
import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { competitionDto, competitionDraftDto } from "@/http/mappers/competition.ts";
import { competitionEntryDto } from "@/http/mappers/competition-entry.ts";
import { teamDto } from "@/http/mappers/team.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerCompetitionRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/organizations/:organizationId/competitions", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
      actorId: c.get("actorId"),
    });
    const membership = memberships.find((item) => item.organizationId === organizationId);
    if (!membership || !["organizer", "staff"].includes(membership.role)) {
      return apiErrorResponse(403, {
        code: "competitions.forbidden",
        messageKey: "errors.competitions.forbidden",
      });
    }

    const competitions = await deps.modules.competitions.listByOrganization.execute({
      organizationId,
    });
    return jsonResponse(
      listOrganizationCompetitionsResponseSchema.parse({
        competitions: competitions.map(competitionDto),
      }),
    );
  });

  secured.post("/organizations/:organizationId/competitions", async (c) => {
    const parsed = createCompetitionDraftRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
      actorId: c.get("actorId"),
    });
    const membership = memberships.find((item) => item.organizationId === organizationId);
    if (!membership || !["organizer", "staff"].includes(membership.role)) {
      return apiErrorResponse(403, {
        code: "competitions.forbidden",
        messageKey: "errors.competitions.forbidden",
      });
    }

    const result = await deps.modules.competitions.createDraft.execute({
      organizationId,
      actorId: c.get("actorId"),
      ...parsed.data,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      createCompetitionDraftResponseSchema.parse(competitionDraftDto(result.value)),
      201,
    );
  });

  secured.get("/organizations/:organizationId/teams", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
      actorId: c.get("actorId"),
    });
    const membership = memberships.find((item) => item.organizationId === organizationId);
    if (!membership || !["organizer", "staff"].includes(membership.role))
      return apiErrorResponse(403, {
        code: "teams.forbidden",
        messageKey: "errors.teams.forbidden",
      });
    const teams = await deps.modules.teams.listByOrganization.execute({ organizationId });
    return jsonResponse(listOrganizationTeamsResponseSchema.parse({ teams: teams.map(teamDto) }));
  });

  secured.get("/organizations/:organizationId/competitions/:competitionId", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
      actorId: c.get("actorId"),
    });
    const membership = memberships.find((item) => item.organizationId === organizationId);
    if (!membership || !["organizer", "staff"].includes(membership.role)) {
      return apiErrorResponse(403, {
        code: "competitions.forbidden",
        messageKey: "errors.competitions.forbidden",
      });
    }

    const draft = await deps.modules.competitions.getDraft.execute({
      organizationId,
      competitionId: asCompetitionId(c.req.param("competitionId")),
    });
    if (!draft) {
      return apiErrorResponse(404, {
        code: "competitions.not_found",
        messageKey: "errors.competitions.not_found",
      });
    }
    return jsonResponse(getCompetitionDraftResponseSchema.parse(competitionDraftDto(draft)));
  });

  secured.patch("/organizations/:organizationId/competitions/:competitionId", async (c) => {
    const parsed = updateCompetitionDraftRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
      actorId: c.get("actorId"),
    });
    const membership = memberships.find((item) => item.organizationId === organizationId);
    if (!membership || !["organizer", "staff"].includes(membership.role))
      return apiErrorResponse(403, {
        code: "competitions.forbidden",
        messageKey: "errors.competitions.forbidden",
      });
    const result = await deps.modules.competitions.updateDraft.execute({
      organizationId,
      competitionId: asCompetitionId(c.req.param("competitionId")),
      ...parsed.data,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      updateCompetitionDraftResponseSchema.parse(competitionDraftDto(result.value)),
    );
  });

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/participants",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
        actorId: c.get("actorId"),
      });
      const membership = memberships.find((item) => item.organizationId === organizationId);
      if (!membership || !["organizer", "staff"].includes(membership.role))
        return apiErrorResponse(403, {
          code: "competitions.forbidden",
          messageKey: "errors.competitions.forbidden",
        });
      const participants = await deps.modules.competitions.listParticipants.execute({
        organizationId,
        competitionId: asCompetitionId(c.req.param("competitionId")),
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
      const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
        actorId: c.get("actorId"),
      });
      const membership = memberships.find((item) => item.organizationId === organizationId);
      if (!membership || !["organizer", "staff"].includes(membership.role))
        return apiErrorResponse(403, {
          code: "competitions.forbidden",
          messageKey: "errors.competitions.forbidden",
        });
      const result = await deps.modules.transaction.runInTransaction(async () => {
        if (parsed.data.kind === "existing-team") {
          const team = await deps.modules.teams.getTeam.execute({
            organizationId,
            teamId: asTeamId(parsed.data.teamId),
          });
          if (!team) return null;
          return deps.modules.competitions.registerTeamEntry.execute({
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
      const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
        actorId: c.get("actorId"),
      });
      const membership = memberships.find((item) => item.organizationId === organizationId);
      if (!membership || !["organizer", "staff"].includes(membership.role))
        return apiErrorResponse(403, {
          code: "competitions.forbidden",
          messageKey: "errors.competitions.forbidden",
        });
      const result = await deps.modules.competitions.removeParticipant.execute({
        organizationId,
        competitionId: asCompetitionId(c.req.param("competitionId")),
        entryId: c.req.param("entryId"),
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return new Response(null, { status: 204 });
    },
  );

  secured.post("/organizations/:organizationId/competitions/:competitionId/publish", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
      actorId: c.get("actorId"),
    });
    const membership = memberships.find((item) => item.organizationId === organizationId);
    if (!membership || !["organizer", "staff"].includes(membership.role))
      return apiErrorResponse(403, {
        code: "competitions.forbidden",
        messageKey: "errors.competitions.forbidden",
      });
    const result = await deps.modules.transaction.runInTransaction(() =>
      deps.modules.competitions.publish.execute({
        organizationId,
        competitionId: asCompetitionId(c.req.param("competitionId")),
      }),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(publishCompetitionResponseSchema.parse(competitionDraftDto(result.value)));
  });

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/invitations",
    async (c) => {
      const parsed = createInvitationRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
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
    const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
      actorId: c.get("actorId"),
    });
    const membership = memberships.find((item) => item.organizationId === organizationId);
    if (!membership || !["organizer", "staff"].includes(membership.role)) {
      return apiErrorResponse(403, {
        code: "competitions.forbidden",
        messageKey: "errors.competitions.forbidden",
      });
    }

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
      organizationId,
      competitionId: asCompetitionId(c.req.param("competitionId")),
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
      const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
        actorId: c.get("actorId"),
      });
      const membership = memberships.find((item) => item.organizationId === organizationId);
      if (!membership || !["organizer", "staff"].includes(membership.role)) {
        return apiErrorResponse(403, {
          code: "competitions.forbidden",
          messageKey: "errors.competitions.forbidden",
        });
      }

      const result = await deps.modules.competitions.approveTeamEntry.execute({
        organizationId,
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
      const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
        actorId: c.get("actorId"),
      });
      const membership = memberships.find((item) => item.organizationId === organizationId);
      if (!membership || !["organizer", "staff"].includes(membership.role)) {
        return apiErrorResponse(403, {
          code: "competitions.forbidden",
          messageKey: "errors.competitions.forbidden",
        });
      }

      const result = await deps.modules.competitions.rejectTeamEntry.execute({
        organizationId,
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
    const draft = await deps.modules.competitions.getDraft.execute({
      organizationId: accepted.value.organizationId,
      competitionId,
    });
    if (!draft) {
      return apiErrorResponse(404, {
        code: "competitions.not_found",
        messageKey: "errors.competitions.not_found",
      });
    }
    const joined = await deps.modules.competitions.join.execute({
      organizationId: accepted.value.organizationId,
      competitionId,
      actorId,
      role: accepted.value.competitionRole,
    });
    if (!joined.isOk()) return failureToHttp(joined.error);

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
