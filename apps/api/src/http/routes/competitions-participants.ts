import type { Hono } from "hono";
import {
  acceptCompetitionInvitationResponseSchema,
  createInvitationResponseSchema,
  listCompetitionParticipantsResponseSchema,
  addCompetitionParticipantResponseSchema,
  publishCompetitionResponseSchema,
  competitionRegistrationResponseSchema,
  registerTeamEntryResponseSchema,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp } from "@/http/errors.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  acceptCompetitionInvitationRoute,
  addCompetitionParticipantRoute,
  approveTeamEntryRoute,
  closeCompetitionRegistrationRoute,
  createCompetitionInvitationRoute,
  listCompetitionParticipantsRoute,
  openCompetitionRegistrationRoute,
  publishCompetitionRoute,
  registerTeamEntryRoute,
  rejectTeamEntryRoute,
  removeCompetitionParticipantRoute,
} from "@/http/openapi/routes/competitions.ts";
import { competitionDraftDto } from "@/http/mappers/competition.ts";
import { competitionEntryDto } from "@/http/mappers/competition-entry.ts";
import { jsonResponse } from "@/utils/http-response.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";

export function registerCompetitionParticipantRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(listCompetitionParticipantsRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
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
  });

  secured.openapi(addCompetitionParticipantRoute, async (c) => {
    const parsed = c.req.valid("json");
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const forbidden = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: COMPETITION_PERMISSION.participantsManage,
      scope: { organizationId, competitionId },
    });
    if (forbidden) return forbidden;
    const result = await deps.modules.transaction.runInTransaction(async () => {
      if (parsed.kind === "existing-team") {
        const team = await deps.modules.teams.getTeam.execute({
          organizationId,
          teamId: asTeamId(parsed.teamId),
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
        name: parsed.name,
        creationKey: parsed.creationKey,
      });
      if (!team.isOk()) return team;
      return deps.modules.competitions.registerTeamEntry.execute({
        actorId: c.get("actorId"),
        organizationId,
        competitionId,
        teamId: team.value.id,
        creationKey: `${competitionId}:${parsed.creationKey}`,
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
  });

  secured.openapi(removeCompetitionParticipantRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.competitions.removeParticipant.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      entryId: params.entryId,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  secured.openapi(publishCompetitionRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.activityCommands.publishCompetition.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(publishCompetitionResponseSchema.parse(competitionDraftDto(result.value)));
  });

  secured.openapi(openCompetitionRegistrationRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.transaction.runInTransaction(() =>
      deps.modules.competitions.openRegistration.execute({
        actorId: c.get("actorId"),
        organizationId: asOrganizationId(params.organizationId),
        competitionId: asCompetitionId(params.competitionId),
      }),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      competitionRegistrationResponseSchema.parse(competitionDraftDto(result.value)),
    );
  });

  secured.openapi(closeCompetitionRegistrationRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.transaction.runInTransaction(() =>
      deps.modules.competitions.closeRegistration.execute({
        actorId: c.get("actorId"),
        organizationId: asOrganizationId(params.organizationId),
        competitionId: asCompetitionId(params.competitionId),
      }),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      competitionRegistrationResponseSchema.parse(competitionDraftDto(result.value)),
    );
  });

  secured.openapi(createCompetitionInvitationRoute, async (c) => {
    const parsed = c.req.valid("json");
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
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
      role: parsed.role,
      invitedByActorId: c.get("actorId"),
      email: parsed.email,
      expiresInMs: parsed.expiresInMs,
      redeemPolicy: parsed.redeemPolicy,
      maxRedemptions: parsed.maxRedemptions,
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
  });

  secured.openapi(registerTeamEntryRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const parsed = c.req.valid("json");

    const team = await deps.modules.teams.getTeam.execute({
      organizationId,
      teamId: asTeamId(parsed.teamId),
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
      creationKey: parsed.creationKey,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      registerTeamEntryResponseSchema.parse(competitionEntryDto(result.value)),
      201,
    );
  });

  secured.openapi(approveTeamEntryRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.competitions.approveTeamEntry.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      entryId: params.entryId,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(registerTeamEntryResponseSchema.parse(competitionEntryDto(result.value)));
  });

  secured.openapi(rejectTeamEntryRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.competitions.rejectTeamEntry.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      entryId: params.entryId,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(registerTeamEntryResponseSchema.parse(competitionEntryDto(result.value)));
  });

  secured.openapi(acceptCompetitionInvitationRoute, async (c) => {
    const parsed = c.req.valid("json");
    const actorId = c.get("actorId");

    // Saga order — nothing is persisted until every read-only check passes:
    //   1. inspect (read-only): validates the token without consuming it.
    //   2. draft lookup (read-only): a missing competition 404s BEFORE the
    //      invitation is consumed or any membership exists.
    //   3. join (idempotent): safe to repeat.
    //   4. accept (consuming): runs last; if it fails the invitation is still
    //      pending and a retry heals everything.
    const inspected = await deps.modules.organizations.inspectCompetitionInvitation.execute({
      token: parsed.token,
      actorId,
    });
    if (!inspected.isOk()) return failureToHttp(inspected.error);

    const organizationId = inspected.value.organizationId;
    const competitionId = inspected.value.competitionId;

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

    const joined = await deps.modules.competitions.join.execute({
      organizationId,
      competitionId,
      actorId,
      role: inspected.value.competitionRole,
    });
    if (!joined.isOk()) return failureToHttp(joined.error);

    const accepted = await deps.modules.organizations.acceptInvitation.execute({
      token: parsed.token,
      actorId,
      requireCompetition: true,
    });
    if (!accepted.isOk()) return failureToHttp(accepted.error);

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
