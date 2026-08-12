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
  competitionTeamManagementDetailResponseSchema,
  competitionTeamManagementListQuerySchema,
  competitionTeamManagementListResponseSchema,
  getTeamExternalClubResponseSchema,
  listRosterResponseSchema,
  openRosterResponseSchema,
} from "@futrob/api-contracts";
import { TEAM_PERMISSION } from "@futrob/teams";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp, validationErrorResponse } from "@/http/errors.ts";
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
import { requireApiPermission } from "@/http/require-api-permission.ts";
import {
  teamRosterManagementDetailDto,
  teamRosterManagementSummaryDto,
} from "@/http/mappers/team-management.ts";

export function registerTeamRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.post("/organizations/:organizationId/teams", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
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
    "/organizations/:organizationId/competitions/:competitionId/team-management",
    async (c) => {
      const parsed = competitionTeamManagementListQuerySchema.safeParse(c.req.query());
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const forbidden = await requireApiPermission(deps, {
        actorId: asActorId(c.get("actorId")),
        permission: COMPETITION_PERMISSION.participantsRead,
        scope: { organizationId, competitionId },
      });
      if (forbidden) return forbidden;
      const result = await deps.modules.teamManagement.list.execute({
        actorId: asActorId(c.get("actorId")),
        organizationId,
        competitionId,
        ...parsed.data,
      });
      return jsonResponse(
        competitionTeamManagementListResponseSchema.parse({
          items: result.items.map(teamRosterManagementSummaryDto),
          nextCursor: result.nextCursor ?? null,
        }),
      );
    },
  );

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/team-management/:teamId",
    async (c) => {
      const result = await deps.modules.teamManagement.get.execute({
        actorId: asActorId(c.get("actorId")),
        organizationId: asOrganizationId(c.req.param("organizationId")),
        competitionId: asCompetitionId(c.req.param("competitionId")),
        teamId: asTeamId(c.req.param("teamId")),
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(
        competitionTeamManagementDetailResponseSchema.parse(
          teamRosterManagementDetailDto(result.value),
        ),
      );
    },
  );

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const forbidden = await requireApiPermission(deps, {
        actorId: asActorId(c.get("actorId")),
        permission: TEAM_PERMISSION.rosterRead,
        scope: { organizationId, competitionId, teamId },
      });
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
      const parsed = addToRosterRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);

      const result = await deps.modules.teams.addToRoster.execute({
        actorId: asActorId(c.get("actorId")),
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
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const parsed = changeRosterRoleRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);

      const result = await deps.modules.teams.changeRosterRole.execute({
        actorId: asActorId(c.get("actorId")),
        organizationId,
        competitionId,
        teamId,
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
      const result = await deps.modules.teams.closeRoster.execute({
        actorId: asActorId(c.get("actorId")),
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
      const result = await deps.modules.teams.openRoster.execute({
        actorId: asActorId(c.get("actorId")),
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
    const parsed = connectTeamExternalClubRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const result = await deps.modules.teams.connectTeamExternalClub.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId,
      teamId,
      providerKey: parsed.data.providerKey,
      externalClubId: parsed.data.externalClubId,
      externalClubName: parsed.data.externalClubName,
      platform: parsed.data.platform,
      gameEdition: parsed.data.gameEdition,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      connectTeamExternalClubResponseSchema.parse(teamExternalClubDto(result.value)),
    );
  });

  secured.get("/organizations/:organizationId/teams/:teamId/external-club", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const teamId = asTeamId(c.req.param("teamId"));
    const forbidden = await requireApiPermission(deps, {
      actorId: asActorId(c.get("actorId")),
      permission: TEAM_PERMISSION.externalClubRead,
      scope: { organizationId, teamId },
    });
    if (forbidden) return forbidden;

    const connection = await deps.modules.teams.getTeamExternalClub.execute({ teamId });
    return jsonResponse(
      getTeamExternalClubResponseSchema.parse(connection ? teamExternalClubDto(connection) : null),
    );
  });

  secured.put(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/external-club",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const parsed = connectTeamExternalClubRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);
      const result = await deps.modules.teams.connectTeamExternalClub.execute({
        actorId: asActorId(c.get("actorId")),
        organizationId,
        competitionId,
        teamId,
        ...parsed.data,
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(
        connectTeamExternalClubResponseSchema.parse(teamExternalClubDto(result.value)),
      );
    },
  );

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/external-club",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const forbidden = await requireApiPermission(deps, {
        actorId: asActorId(c.get("actorId")),
        permission: TEAM_PERMISSION.externalClubRead,
        scope: { organizationId, competitionId, teamId },
      });
      if (forbidden) return forbidden;
      const connection = await deps.modules.teams.getTeamExternalClub.execute({ teamId });
      return jsonResponse(
        getTeamExternalClubResponseSchema.parse(
          connection ? teamExternalClubDto(connection) : null,
        ),
      );
    },
  );

  secured.post(
    "/organizations/:organizationId/competitions/:competitionId/teams/:teamId/roster-invitations",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
      const teamId = asTeamId(c.req.param("teamId"));
      const parsed = createRosterInvitationRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);

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
