import type { Hono } from "hono";
import { listActivitiesResponseSchema, type ActivityEntryDto } from "@futrob/api-contracts";
import type { ActivityAudienceScope, ActivityEntry } from "@futrob/notifications";
import { RESULT_PERMISSION } from "@futrob/results";
import { asOrganizationId, type ActorId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  listMyActivitiesRoute,
  listOrganizationActivitiesRoute,
} from "@/http/openapi/routes/notifications.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";
import { jsonResponse } from "@/utils/http-response.ts";

function activityDto(entry: ActivityEntry): ActivityEntryDto {
  return {
    id: entry.id,
    organizationId: entry.organizationId,
    competitionId: entry.competitionId,
    audience: entry.audience,
    kind: entry.kind,
    status: entry.status,
    requiresAction: entry.requiresAction,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    subject: entry.subject,
    openedAt: entry.openedAt.toISOString(),
    closedAt: entry.closedAt?.toISOString() ?? null,
    expiresAt: entry.expiresAt?.toISOString() ?? null,
    lastEventAt: entry.lastEventAt.toISOString(),
  };
}

/**
 * Activity feeds. The organization feed is for operators: it needs the permission that
 * lets them act on what it lists (`encounters.results.approve` on the organization).
 * The personal feed lists the actor's own rows and those of the Teams the actor
 * represents as captain or vice-captain.
 */
export function registerActivityRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  /**
   * Teams the actor speaks for, each only in the competition where the roster gives that
   * authority (ADR-0017): captain of a Team in one league is not its captain in another.
   */
  async function representedTeams(actorId: ActorId): Promise<readonly ActivityAudienceScope[]> {
    const { teams } = deps.modules;
    const details = await teams.getPlayerProfile.execute({ actorId });
    if (!details.profile) return [];
    const memberships = await teams.listRostersForPlayer.execute({
      playerProfileId: details.profile.id,
    });
    return memberships
      .filter((membership) => membership.role !== "player")
      .map((membership) => ({
        audience: "team" as const,
        audienceId: membership.teamId,
        competitionId: membership.competitionId,
      }));
  }

  secured.openapi(listOrganizationActivitiesRoute, async (c) => {
    const organizationId = asOrganizationId(c.req.valid("param").organizationId);
    const forbidden = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: RESULT_PERMISSION.resultApprove,
      scope: { organizationId },
    });
    if (forbidden) return forbidden;
    const filters = c.req.valid("query");
    const result = await deps.modules.notifications.listActivities.execute({
      audiences: [{ audience: "organization", audienceId: organizationId }],
      ...filters,
      organizationId,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listActivitiesResponseSchema.parse({
        activities: result.value.items.map(activityDto),
        nextCursor: result.value.nextCursor ?? null,
      }),
    );
  });

  secured.openapi(listMyActivitiesRoute, async (c) => {
    const actorId = c.get("actorId");
    const { organizationId, ...filters } = c.req.valid("query");
    const result = await deps.modules.notifications.listActivities.execute({
      audiences: [{ audience: "actor", audienceId: actorId }, ...(await representedTeams(actorId))],
      ...filters,
      organizationId: organizationId ? asOrganizationId(organizationId) : undefined,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listActivitiesResponseSchema.parse({
        activities: result.value.items.map(activityDto),
        nextCursor: result.value.nextCursor ?? null,
      }),
    );
  });

  app.route("/", secured);
}
