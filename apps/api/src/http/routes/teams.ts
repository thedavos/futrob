import type { Hono } from "hono";
import {
  addToRosterResponseSchema,
  acceptRosterInvitationResponseSchema,
  changeRosterRoleResponseSchema,
  closeRosterResponseSchema,
  connectTeamExternalClubResponseSchema,
  createRosterInvitationResponseSchema,
  createTeamResponseSchema,
  competitionTeamManagementDetailResponseSchema,
  competitionTeamManagementListResponseSchema,
  getTeamExternalClubResponseSchema,
  listMyRosterInvitationsResponseSchema,
  listRosterResponseSchema,
  openRosterResponseSchema,
  respondToRosterInvitationResponseSchema,
} from "@futrob/api-contracts";
import { TEAM_PERMISSION } from "@futrob/teams";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import {
  rosterInvitationInboxItemDto,
  rosterInvitationMetaDto,
  rosterMembershipDto,
  rosterStateDto,
  teamDto,
  teamExternalClubDto,
} from "@/http/mappers/team.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  acceptRosterInvitationRoute,
  listMyRosterInvitationsRoute,
  respondToRosterInvitationRoute,
} from "@/http/openapi/routes/players.ts";
import {
  addToTeamRosterRoute,
  changeRosterRoleRoute,
  closeTeamRosterRoute,
  connectCompetitionTeamExternalClubRoute,
  connectOrganizationTeamExternalClubRoute,
  createOrganizationTeamRoute,
  createRosterInvitationRoute,
  getCompetitionTeamExternalClubRoute,
  getCompetitionTeamManagementRoute,
  getOrganizationTeamExternalClubRoute,
  listCompetitionTeamManagementRoute,
  listTeamRosterRoute,
  openTeamRosterRoute,
} from "@/http/openapi/routes/teams.ts";
import { jsonResponse } from "@/utils/http-response.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";
import {
  teamRosterManagementDetailDto,
  teamRosterManagementSummaryDto,
} from "@/http/mappers/team-management.ts";

export function registerTeamRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(createOrganizationTeamRoute, async (c) => {
    const organizationId = asOrganizationId(c.req.valid("param").organizationId);
    const parsed = c.req.valid("json");
    const result = await deps.modules.teams.createTeam.execute({
      organizationId,
      actorId: c.get("actorId"),
      name: parsed.name,
      creationKey: parsed.creationKey,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(createTeamResponseSchema.parse(teamDto(result.value)), 201);
  });

  secured.openapi(listCompetitionTeamManagementRoute, async (c) => {
    const parsed = c.req.valid("query");
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
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
      ...parsed,
    });
    return jsonResponse(
      competitionTeamManagementListResponseSchema.parse({
        items: result.items.map(teamRosterManagementSummaryDto),
        nextCursor: result.nextCursor ?? null,
      }),
    );
  });

  secured.openapi(getCompetitionTeamManagementRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.teamManagement.get.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      teamId: asTeamId(params.teamId),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      competitionTeamManagementDetailResponseSchema.parse(
        teamRosterManagementDetailDto(result.value),
      ),
    );
  });

  secured.openapi(listTeamRosterRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const teamId = asTeamId(params.teamId);
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
  });

  secured.openapi(addToTeamRosterRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const teamId = asTeamId(params.teamId);
    const parsed = c.req.valid("json");

    const result = await deps.modules.teams.addToRoster.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId,
      competitionId,
      teamId,
      playerProfileId: parsed.playerProfileId,
      gameAccountId: parsed.gameAccountId,
      role: parsed.role,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(addToRosterResponseSchema.parse(rosterMembershipDto(result.value)), 201);
  });

  secured.openapi(changeRosterRoleRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const teamId = asTeamId(params.teamId);
    const parsed = c.req.valid("json");

    const result = await deps.modules.teams.changeRosterRole.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId,
      competitionId,
      teamId,
      rosterMembershipId: params.membershipId,
      role: parsed.role,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(changeRosterRoleResponseSchema.parse(rosterMembershipDto(result.value)));
  });

  secured.openapi(closeTeamRosterRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.teams.closeRoster.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      teamId: asTeamId(params.teamId),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(closeRosterResponseSchema.parse(rosterStateDto(result.value)));
  });

  secured.openapi(openTeamRosterRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.teams.openRoster.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      teamId: asTeamId(params.teamId),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(openRosterResponseSchema.parse(rosterStateDto(result.value)));
  });

  secured.openapi(connectOrganizationTeamExternalClubRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const teamId = asTeamId(params.teamId);
    const parsed = c.req.valid("json");

    const result = await deps.modules.teams.connectTeamExternalClub.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId,
      teamId,
      providerKey: parsed.providerKey,
      externalClubId: parsed.externalClubId,
      externalClubName: parsed.externalClubName,
      platform: parsed.platform,
      gameEdition: parsed.gameEdition,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      connectTeamExternalClubResponseSchema.parse(teamExternalClubDto(result.value)),
    );
  });

  secured.openapi(getOrganizationTeamExternalClubRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const teamId = asTeamId(params.teamId);
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

  secured.openapi(connectCompetitionTeamExternalClubRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const teamId = asTeamId(params.teamId);
    const parsed = c.req.valid("json");
    const result = await deps.modules.teams.connectTeamExternalClub.execute({
      actorId: asActorId(c.get("actorId")),
      organizationId,
      competitionId,
      teamId,
      ...parsed,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      connectTeamExternalClubResponseSchema.parse(teamExternalClubDto(result.value)),
    );
  });

  secured.openapi(getCompetitionTeamExternalClubRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const teamId = asTeamId(params.teamId);
    const forbidden = await requireApiPermission(deps, {
      actorId: asActorId(c.get("actorId")),
      permission: TEAM_PERMISSION.externalClubRead,
      scope: { organizationId, competitionId, teamId },
    });
    if (forbidden) return forbidden;
    const connection = await deps.modules.teams.getTeamExternalClub.execute({ teamId });
    return jsonResponse(
      getTeamExternalClubResponseSchema.parse(connection ? teamExternalClubDto(connection) : null),
    );
  });

  secured.openapi(createRosterInvitationRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const teamId = asTeamId(params.teamId);
    const parsed = c.req.valid("json");

    const result = await deps.modules.activityCommands.createRosterInvitation.execute({
      organizationId,
      competitionId,
      teamId,
      invitedByActorId: asActorId(c.get("actorId")),
      role: parsed.role,
      expiresInMs: parsed.expiresInMs,
      redeemPolicy: parsed.redeemPolicy,
      inviteeIdentifier: parsed.inviteeIdentifier,
      message: parsed.message,
      invitedByDisplayName: parsed.invitedByDisplayName,
    });
    if (!result.isOk()) return failureToHttp(result.error);

    return jsonResponse(
      createRosterInvitationResponseSchema.parse({
        ...rosterInvitationMetaDto(result.value),
        token: result.value.token,
      }),
      201,
    );
  });

  secured.openapi(acceptRosterInvitationRoute, async (c) => {
    const parsed = c.req.valid("json");
    const result = await deps.modules.activityCommands.acceptRosterInvitation.execute({
      token: parsed.token,
      actorId: asActorId(c.get("actorId")),
    });
    if (!result.isOk()) return failureToHttp(result.error);

    return jsonResponse(
      acceptRosterInvitationResponseSchema.parse(rosterMembershipDto(result.value)),
      201,
    );
  });

  secured.openapi(listMyRosterInvitationsRoute, async (c) => {
    const actorId = asActorId(c.get("actorId"));
    const invitations = await deps.modules.teams.listMyRosterInvitations.execute({ actorId });
    const { teams, rosters, profiles } = deps.modules.teams.repositories;

    const items = await Promise.all(
      invitations.map(async (invitation) => {
        const [team, externalClub, inviterProfile] = await Promise.all([
          teams.findById(invitation.organizationId, invitation.teamId),
          deps.modules.teams.getTeamExternalClub.execute({ teamId: invitation.teamId }),
          profiles.findByActor(invitation.invitedByActorId),
        ]);
        const inviterMembership = inviterProfile
          ? await rosters.findByTeamPlayerCompetition(
              invitation.teamId,
              inviterProfile.id,
              invitation.competitionId,
            )
          : null;
        return rosterInvitationInboxItemDto({
          invitation,
          team,
          externalClub,
          inviterRole: inviterMembership?.role ?? null,
        });
      }),
    );

    return jsonResponse(listMyRosterInvitationsResponseSchema.parse({ invitations: items }));
  });

  secured.openapi(respondToRosterInvitationRoute, async (c) => {
    const parsed = c.req.valid("json");
    const result = await deps.modules.activityCommands.respondToRosterInvitation.execute({
      invitationId: c.req.valid("param").invitationId,
      actorId: asActorId(c.get("actorId")),
      action: parsed.action,
    });
    if (!result.isOk()) return failureToHttp(result.error);

    const outcome = result.value;
    return jsonResponse(
      respondToRosterInvitationResponseSchema.parse(
        outcome.kind === "accepted"
          ? { status: "accepted", membership: rosterMembershipDto(outcome.membership) }
          : { status: "declined", membership: null },
      ),
    );
  });

  app.route("/", secured);
}
