import {
  accessGrantSchema,
  changeCompetitionRoleRequestSchema,
  changeOrganizationRoleRequestSchema,
  competitionRoleAssignmentSchema,
  deleteAccessGrantQuerySchema,
  effectiveAccessSchema,
  getEffectiveAccessQuerySchema,
  listAccessGrantsQuerySchema,
  listAccessGrantsResponseSchema,
  manageSuperuserRequestSchema,
  organizationRoleAssignmentSchema,
  permissionSchema,
  platformRoleAssignmentSchema,
  upsertAccessGrantRequestSchema,
} from "@futrob/api-contracts";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationScope,
  type Permission,
} from "@futrob/shared-kernel";
import { Hono } from "hono";
import type { AccessGrant } from "@futrob/organizations";
import type { AppDeps } from "@/app.ts";
import { failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerAuthorizationRoutes(app: Hono, deps: AppDeps): void {
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/authorization/effective-access", async (c) => {
    const parsed = getEffectiveAccessQuerySchema.safeParse(c.req.query());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const access = await deps.modules.authorization.getEffectiveAccess.execute({
      actorId: c.get("actorId"),
      scope: toScope(parsed.data),
      permissions: parsed.data.permissions?.map((value) =>
        toPermission(permissionSchema.parse(value)),
      ),
    });
    return jsonResponse(effectiveAccessSchema.parse(access));
  });

  secured.put("/authorization/grants", async (c) => {
    const parsed = upsertAccessGrantRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.authorization.upsertGrant.execute({
      id: parsed.data.id,
      actorId: c.get("actorId"),
      targetActorId: asActorId(parsed.data.targetActorId),
      organizationId: parsed.data.organizationId
        ? asOrganizationId(parsed.data.organizationId)
        : null,
      permission: toPermission(permissionSchema.parse(parsed.data.permission)),
      effect: parsed.data.effect,
      scopeType: parsed.data.scopeType,
      scopeId: parsed.data.scopeId,
      scope: toScope(parsed.data),
      reason: parsed.data.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(accessGrantSchema.parse(grantDto(result.value)));
  });

  secured.get("/authorization/grants", async (c) => {
    const parsed = listAccessGrantsQuerySchema.safeParse(c.req.query());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.authorization.listGrants.execute({
      actorId: c.get("actorId"),
      targetActorId: parsed.data.targetActorId ? asActorId(parsed.data.targetActorId) : undefined,
      organizationId: parsed.data.organizationId
        ? asOrganizationId(parsed.data.organizationId)
        : null,
      scopeType: parsed.data.scopeType,
      scopeId: parsed.data.scopeId,
      scope: toScope(parsed.data),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listAccessGrantsResponseSchema.parse({ grants: result.value.map(grantDto) }),
    );
  });

  secured.delete("/authorization/grants/:grantId", async (c) => {
    const parsed = deleteAccessGrantQuerySchema.safeParse(c.req.query());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.authorization.deleteGrant.execute({
      actorId: c.get("actorId"),
      grantId: c.req.param("grantId"),
      scope: toScope(parsed.data),
      reason: parsed.data.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  secured.patch("/organizations/:organizationId/members/:actorId/role", async (c) => {
    const parsed = changeOrganizationRoleRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.authorization.changeOrganizationRole.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.param("organizationId")),
      targetActorId: asActorId(c.req.param("actorId")),
      role: parsed.data.role,
      reason: parsed.data.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      organizationRoleAssignmentSchema.parse({
        ...result.value,
        createdAt: result.value.createdAt.toISOString(),
      }),
    );
  });

  secured.patch(
    "/organizations/:organizationId/competitions/:competitionId/members/:actorId/role",
    async (c) => {
      const parsed = changeCompetitionRoleRequestSchema.safeParse(
        await c.req.json().catch(() => null),
      );
      if (!parsed.success) return validationErrorResponse(parsed.error.issues);
      const result = await deps.modules.competitions.changeMembershipRole.execute({
        actorId: c.get("actorId"),
        organizationId: asOrganizationId(c.req.param("organizationId")),
        competitionId: asCompetitionId(c.req.param("competitionId")),
        targetActorId: asActorId(c.req.param("actorId")),
        role: parsed.data.role,
        reason: parsed.data.reason,
      });
      if (!result.isOk()) return failureToHttp(result.error);
      return jsonResponse(
        competitionRoleAssignmentSchema.parse({
          ...result.value,
          createdAt: result.value.createdAt.toISOString(),
        }),
      );
    },
  );

  secured.put("/authorization/superusers/:actorId", async (c) => {
    const parsed = manageSuperuserRequestSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.authorization.assignSuperuser.execute({
      actorId: c.get("actorId"),
      targetActorId: asActorId(c.req.param("actorId")),
      reason: parsed.data.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      platformRoleAssignmentSchema.parse({
        ...result.value,
        createdAt: result.value.createdAt.toISOString(),
      }),
    );
  });

  secured.delete("/authorization/superusers/:actorId", async (c) => {
    const parsed = manageSuperuserRequestSchema.safeParse(c.req.query());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.authorization.revokeSuperuser.execute({
      actorId: c.get("actorId"),
      targetActorId: asActorId(c.req.param("actorId")),
      reason: parsed.data.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  app.route("/", secured);
}

function toScope(input: {
  readonly organizationId?: string | null;
  readonly competitionId?: string;
  readonly teamId?: string;
  readonly encounterId?: string;
}): AuthorizationScope {
  return {
    organizationId: input.organizationId ? asOrganizationId(input.organizationId) : undefined,
    competitionId: input.competitionId ? asCompetitionId(input.competitionId) : undefined,
    teamId: input.teamId ? asTeamId(input.teamId) : undefined,
    encounterId: input.encounterId ? asEncounterId(input.encounterId) : undefined,
  };
}

function grantDto(grant: AccessGrant) {
  return {
    ...grant,
    createdAt: grant.createdAt.toISOString(),
    updatedAt: grant.updatedAt.toISOString(),
  };
}

function toPermission(value: string): Permission {
  const parsed = permissionSchema.parse(value);
  // SAFETY: Permission wire values are validated by permissionSchema before branding.
  return parsed as Permission;
}
