import { Hono } from "hono";
import {
  listActivitiesQuerySchema,
  listActivitiesResponseSchema,
  type ActivityEntryDto,
} from "@futrob/api-contracts";
import type { ActivityAudienceRef, ActivityEntry } from "@futrob/notifications";
import { RESULT_PERMISSION } from "@futrob/results";
import { asOrganizationId, type ActorId, type OrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
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
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  async function list(
    query: Record<string, string>,
    audiences: readonly ActivityAudienceRef[],
    organizationId?: OrganizationId,
  ): Promise<Response> {
    const parsed = listActivitiesQuerySchema.safeParse(query);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.notifications.listActivities.execute({
      audiences,
      organizationId,
      ...parsed.data,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listActivitiesResponseSchema.parse({
        activities: result.value.items.map(activityDto),
        nextCursor: result.value.nextCursor ?? null,
      }),
    );
  }

  async function representedTeamIds(actorId: ActorId): Promise<readonly string[]> {
    const { teams } = deps.modules;
    const details = await teams.getPlayerProfile.execute({ actorId });
    if (!details.profile) return [];
    const memberships = await teams.listRostersForPlayer.execute({
      playerProfileId: details.profile.id,
    });
    return [
      ...new Set(
        memberships
          .filter((membership) => membership.role !== "player")
          .map((membership) => membership.teamId),
      ),
    ];
  }

  secured.get("/organizations/:organizationId/activities", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const forbidden = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: RESULT_PERMISSION.resultApprove,
      scope: { organizationId },
    });
    if (forbidden) return forbidden;
    return list(
      c.req.query(),
      [{ audience: "organization", audienceId: organizationId }],
      organizationId,
    );
  });

  secured.get("/players/me/activities", async (c) => {
    const actorId = c.get("actorId");
    const teamIds = await representedTeamIds(actorId);
    return list(c.req.query(), [
      { audience: "actor", audienceId: actorId },
      ...teamIds.map((teamId) => ({ audience: "team" as const, audienceId: teamId })),
    ]);
  });

  app.route("/", secured);
}
