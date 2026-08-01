import { Hono } from "hono";
import {
  addToRosterRequestSchema,
  addToRosterResponseSchema,
  createTeamRequestSchema,
  createTeamResponseSchema,
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
import { apiErrorResponse, domainErrorToHttp, validationErrorResponse } from "@/http/errors.ts";
import { rosterMembershipDto, teamDto } from "@/http/mappers/team.ts";
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
    if (!result.ok) return domainErrorToHttp(result.error);
    return jsonResponse(createTeamResponseSchema.parse(teamDto(result.value)), 201);
  });

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
      if (!result.ok) return domainErrorToHttp(result.error);
      return jsonResponse(addToRosterResponseSchema.parse(rosterMembershipDto(result.value)), 201);
    },
  );

  app.route("/", secured);
}
