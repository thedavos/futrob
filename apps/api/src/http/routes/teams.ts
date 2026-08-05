import { Hono } from "hono";
import {
  addToRosterRequestSchema,
  addToRosterResponseSchema,
  acceptRosterInvitationRequestSchema,
  acceptRosterInvitationResponseSchema,
  changeRosterRoleRequestSchema,
  changeRosterRoleResponseSchema,
  closeRosterResponseSchema,
  connectTeamExternalClubRequestSchema,
  connectTeamExternalClubResponseSchema,
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
  createTeamRequestSchema,
  createTeamResponseSchema,
  getTeamExternalClubResponseSchema,
  listRosterResponseSchema,
  openRosterResponseSchema,
} from "@futrob/api-contracts";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  rosterInvitationMetaDto,
  rosterMembershipDto,
  rosterStateDto,
  teamDto,
  teamExternalClubDto,
} from "@/http/mappers/team.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

async function requireOrgOperator(
  deps: AppDeps,
  actorId: ActorId,
  organizationId: OrganizationId,
): Promise<Response | null> {
  const memberships = await deps.modules.organizations.listMembershipsForActor.execute({
    actorId,
  });
  const membership = memberships.find((item) => item.organizationId === organizationId);
  if (!membership || !["organizer", "staff"].includes(membership.role)) {
    return apiErrorResponse(403, {
      code: "teams.forbidden",
      messageKey: "errors.teams.forbidden",
    });
  }
  return null;
}

export function registerTeamRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.post("/organizations/:organizationId/teams", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
    if (forbidden) return forbidden;

    const parsed = createTeamRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const result = await deps.modules.teams.createTeam.execute({
      organizationId,
      actorId: c.get("actorId"),
      name: parsed.data.name,
      creationKey: parsed.data.creationKey,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(createTeamResponseSchema.parse(teamDto(result.value)), 201);
  });

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
      if (forbidden) return forbidden;

      const memberships = await deps.modules.teams.listRosterForTeam.execute({
        organizationId,
        competitionId,
        teamId,
      });
      return jsonResponse(
        listRosterResponseSchema.parse({
          memberships: memberships.map(rosterMembershipDto),
        }),
      );
    },
  );

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
      if (forbidden) return forbidden;

      const parsed = addToRosterRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);

      const entry = await deps.modules.competitions.getTeamEntry.execute({
        organizationId,
        competitionId,
        teamId,
      });
      if (!entry) {
        return apiErrorResponse(404, {
          code: "competitions.entry_not_found",
          messageKey: "errors.competitions.entry_not_found",
        });
      }

      const result = await deps.modules.teams.addToRoster.execute({
        organizationId,
        competitionId,
        teamId,
        playerProfileId: parsed.data.playerProfileId,
        gameAccountId: parsed.data.gameAccountId,
        role: parsed.data.role,
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(addToRosterResponseSchema.parse(rosterMembershipDto(result.value)), 201);
    },
  );

  secured.patch(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster/:membershipId",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
      if (forbidden) return forbidden;

      const parsed = changeRosterRoleRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);

      const result = await deps.modules.teams.changeRosterRole.execute({
        rosterMembershipId: c.req.param("membershipId"),
        role: parsed.data.role,
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(changeRosterRoleResponseSchema.parse(rosterMembershipDto(result.value)));
    },
  );

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster/close",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
      if (forbidden) return forbidden;

      const result = await deps.modules.teams.closeRoster.execute({
        organizationId,
        competitionId,
        teamId,
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(closeRosterResponseSchema.parse(rosterStateDto(result.value)));
    },
  );

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster/open",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
      if (forbidden) return forbidden;

      const result = await deps.modules.teams.openRoster.execute({
        organizationId,
        competitionId,
        teamId,
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(openRosterResponseSchema.parse(rosterStateDto(result.value)));
    },
  );

  secured.put("/organizations/:organizationId/teams/:teamId/external-club", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const teamId = asTeamId(c.req.param("teamId"));
    const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
    if (forbidden) return forbidden;

    const parsed = connectTeamExternalClubRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const result = await deps.modules.teams.connectTeamExternalClub.execute({
      organizationId,
      teamId,
      providerKey: parsed.data.providerKey,
      externalClubId: parsed.data.externalClubId,
      externalClubName: parsed.data.externalClubName,
      platform: parsed.data.platform,
      gameEdition: parsed.data.gameEdition,
      verifiedAt: parsed.data.verifiedAt ? new Date(parsed.data.verifiedAt) : null,
      verifiedBy: parsed.data.verifiedBy ?? null,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      connectTeamExternalClubResponseSchema.parse(teamExternalClubDto(result.value)),
    );
  });

  secured.get("/organizations/:organizationId/teams/:teamId/external-club", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const teamId = asTeamId(c.req.param("teamId"));
    const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
    if (forbidden) return forbidden;

    const connection = await deps.modules.teams.getTeamExternalClub.execute({ teamId });
    return jsonResponse(
      getTeamExternalClubResponseSchema.parse(connection ? teamExternalClubDto(connection) : null),
    );
  });

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster-invitations",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const forbidden = await requireOrgOperator(deps, asActorId(c.get("actorId")), organizationId);
      if (forbidden) return forbidden;

      const parsed = createRosterInvitationRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);

      const entry = await deps.modules.competitions.getTeamEntry.execute({
        organizationId,
        competitionId,
        teamId,
      });
      if (!entry) {
        return apiErrorResponse(404, {
          code: "competitions.entry_not_found",
          messageKey: "errors.competitions.entry_not_found",
        });
      }

      const result = await deps.modules.teams.createRosterInvitation.execute({
        organizationId,
        competitionId,
        teamId,
        invitedByActorId: asActorId(c.get("actorId")),
        role: parsed.data.role,
        expiresInMs: parsed.data.expiresInMs,
        redeemPolicy: parsed.data.redeemPolicy,
      });
      if (!result.isOk()) return failureToHttp(result.error);

      return jsonResponse(
        createRosterInvitationResponseSchema.parse({
          ...rosterInvitationMetaDto(result.value),
          token: result.value.token,
        }),
        201,
      );
    },
  );

  secured.post("/roster-invitations/accept", async (c) => {
    const parsed = acceptRosterInvitationRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const result = await deps.modules.teams.acceptRosterInvitation.execute({
      token: parsed.data.token,
      actorId: asActorId(c.get("actorId")),
    });
    if (!result.isOk()) return failureToHttp(result.error);

    return jsonResponse(
      acceptRosterInvitationResponseSchema.parse(rosterMembershipDto(result.value)),
      201,
    );
  });

  app.route("/", secured);
}
