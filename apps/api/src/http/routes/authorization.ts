import {
  accessGrantSchema,
  competitionRoleAssignmentSchema,
  effectiveAccessSchema,
  listAccessGrantsResponseSchema,
  organizationRoleAssignmentSchema,
  permissionSchema,
  platformRoleAssignmentSchema,
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
import type { Hono } from "hono";
import type { AccessGrant } from "@futrob/organizations";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  assignSuperuserRoute,
  changeCompetitionRoleRoute,
  changeOrganizationRoleRoute,
  deleteAccessGrantRoute,
  getEffectiveAccessRoute,
  listAccessGrantsRoute,
  revokeSuperuserRoute,
  upsertAccessGrantRoute,
} from "@/http/openapi/routes/authorization.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerAuthorizationRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getEffectiveAccessRoute, async (c) => {
    const parsed = c.req.valid("query");
    const access = await deps.modules.authorization.getEffectiveAccess.execute({
      actorId: c.get("actorId"),
      scope: toScope(parsed),
      permissions: parsed.permissions?.map((value) => toPermission(permissionSchema.parse(value))),
    });
    return jsonResponse(effectiveAccessSchema.parse(access));
  });

  secured.openapi(upsertAccessGrantRoute, async (c) => {
    const parsed = c.req.valid("json");
    const result = await deps.modules.authorization.upsertGrant.execute({
      id: parsed.id,
      actorId: c.get("actorId"),
      targetActorId: asActorId(parsed.targetActorId),
      organizationId: parsed.organizationId ? asOrganizationId(parsed.organizationId) : null,
      permission: toPermission(permissionSchema.parse(parsed.permission)),
      effect: parsed.effect,
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      scope: toScope(parsed),
      reason: parsed.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(accessGrantSchema.parse(grantDto(result.value)));
  });

  secured.openapi(listAccessGrantsRoute, async (c) => {
    const parsed = c.req.valid("query");
    const result = await deps.modules.authorization.listGrants.execute({
      actorId: c.get("actorId"),
      targetActorId: parsed.targetActorId ? asActorId(parsed.targetActorId) : undefined,
      organizationId: parsed.organizationId ? asOrganizationId(parsed.organizationId) : null,
      scopeType: parsed.scopeType,
      scopeId: parsed.scopeId,
      scope: toScope(parsed),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listAccessGrantsResponseSchema.parse({ grants: result.value.map(grantDto) }),
    );
  });

  secured.openapi(deleteAccessGrantRoute, async (c) => {
    const parsed = c.req.valid("query");
    const result = await deps.modules.authorization.deleteGrant.execute({
      actorId: c.get("actorId"),
      grantId: c.req.valid("param").grantId,
      scope: toScope(parsed),
      reason: parsed.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return new Response(null, { status: 204 });
  });

  secured.openapi(changeOrganizationRoleRoute, async (c) => {
    const parsed = c.req.valid("json");
    const params = c.req.valid("param");
    const result = await deps.modules.authorization.changeOrganizationRole.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      targetActorId: asActorId(params.actorId),
      role: parsed.role,
      reason: parsed.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      organizationRoleAssignmentSchema.parse({
        ...result.value,
        createdAt: result.value.createdAt.toISOString(),
      }),
    );
  });

  secured.openapi(changeCompetitionRoleRoute, async (c) => {
    const parsed = c.req.valid("json");
    const params = c.req.valid("param");
    const result = await deps.modules.competitions.changeMembershipRole.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      targetActorId: asActorId(params.actorId),
      role: parsed.role,
      reason: parsed.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      competitionRoleAssignmentSchema.parse({
        ...result.value,
        createdAt: result.value.createdAt.toISOString(),
      }),
    );
  });

  secured.openapi(assignSuperuserRoute, async (c) => {
    const parsed = c.req.valid("json");
    const result = await deps.modules.authorization.assignSuperuser.execute({
      actorId: c.get("actorId"),
      targetActorId: asActorId(c.req.valid("param").actorId),
      reason: parsed.reason,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      platformRoleAssignmentSchema.parse({
        ...result.value,
        createdAt: result.value.createdAt.toISOString(),
      }),
    );
  });

  secured.openapi(revokeSuperuserRoute, async (c) => {
    const parsed = c.req.valid("query");
    const result = await deps.modules.authorization.revokeSuperuser.execute({
      actorId: c.get("actorId"),
      targetActorId: asActorId(c.req.valid("param").actorId),
      reason: parsed.reason,
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
