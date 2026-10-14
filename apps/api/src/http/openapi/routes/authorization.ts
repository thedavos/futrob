import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  AccessGrant,
  ChangeCompetitionRoleRequest,
  ChangeOrganizationRoleRequest,
  CompetitionRoleAssignment,
  EffectiveAccess,
  UpsertAccessGrantRequest,
} from "@/http/openapi/components.ts";
import {
  deleteAccessGrantQuerySchema,
  getEffectiveAccessQuerySchema,
  listAccessGrantsQuerySchema,
  listAccessGrantsResponseSchema,
} from "@futrob/api-contracts";

export const getEffectiveAccessRoute = defineRoute({
  method: "get",
  path: "/authorization/effective-access",
  operationId: "getEffectiveAccess",
  tags: ["authorization"],
  summary: "Resolve the authenticated actor's effective permissions",
  query: getEffectiveAccessQuerySchema,
  success: { status: 200, description: "Effective access", schema: EffectiveAccess },
  errors: [400, 401],
});

export const listAccessGrantsRoute = defineRoute({
  method: "get",
  path: "/authorization/grants",
  operationId: "listAccessGrants",
  tags: ["authorization"],
  summary: "List contextual grants in an authorized scope",
  query: listAccessGrantsQuerySchema,
  success: {
    status: 200,
    description: "Contextual grants",
    schema: listAccessGrantsResponseSchema,
  },
  errors: [403, 404],
});

export const upsertAccessGrantRoute = defineRoute({
  method: "put",
  path: "/authorization/grants",
  operationId: "upsertAccessGrant",
  tags: ["authorization"],
  summary: "Create or replace a contextual allow/deny override",
  body: UpsertAccessGrantRequest,
  success: { status: 200, description: "Persisted grant", schema: AccessGrant },
  errors: [400, 403, 404],
});

export const deleteAccessGrantRoute = defineRoute({
  method: "delete",
  path: "/authorization/grants/{grantId}",
  operationId: "deleteAccessGrant",
  tags: ["authorization"],
  summary: "Delete a contextual override",
  params: pathParams(["grantId"]),
  query: deleteAccessGrantQuerySchema,
  success: { status: 204, description: "Grant deleted" },
  errors: [403, 404],
});

export const changeOrganizationRoleRoute = defineRoute({
  method: "patch",
  path: "/organizations/{organizationId}/members/{actorId}/role",
  operationId: "changeOrganizationRole",
  tags: ["authorization"],
  summary: "Change an organization membership role",
  params: pathParams(["organizationId", "actorId"]),
  body: ChangeOrganizationRoleRequest,
  success: { status: 200, description: "Updated role" },
  errors: [403, 404, 409],
});

export const changeCompetitionRoleRoute = defineRoute({
  method: "patch",
  path: "/organizations/{organizationId}/competitions/{competitionId}/members/{actorId}/role",
  operationId: "changeCompetitionRole",
  tags: ["authorization"],
  summary: "Change a competition membership role",
  params: pathParams(["organizationId", "competitionId", "actorId"]),
  body: ChangeCompetitionRoleRequest,
  success: {
    status: 200,
    description: "Updated competition role",
    schema: CompetitionRoleAssignment,
  },
  errors: [403, 404],
});

export const assignSuperuserRoute = defineRoute({
  method: "put",
  path: "/authorization/superusers/{actorId}",
  operationId: "assignSuperuser",
  tags: ["authorization"],
  summary: "Assign an audited platform superuser",
  params: pathParams(["actorId"]),
  success: { status: 200, description: "Assigned superuser" },
  errors: [403],
});

export const revokeSuperuserRoute = defineRoute({
  method: "delete",
  path: "/authorization/superusers/{actorId}",
  operationId: "revokeSuperuser",
  tags: ["authorization"],
  summary: "Revoke an audited platform superuser",
  params: pathParams(["actorId"]),
  success: { status: 204, description: "Revoked superuser" },
  errors: [403, 409],
});
