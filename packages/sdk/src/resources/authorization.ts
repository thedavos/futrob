import {
  accessGrantSchema,
  changeCompetitionRoleRequestSchema,
  changeOrganizationRoleRequestSchema,
  competitionRoleAssignmentSchema,
  effectiveAccessSchema,
  listAccessGrantsQuerySchema,
  listAccessGrantsResponseSchema,
  manageSuperuserRequestSchema,
  organizationRoleAssignmentSchema,
  platformRoleAssignmentSchema,
  upsertAccessGrantRequestSchema,
  type AccessGrantDto,
  type AuthorizationScopeDto,
  type ChangeOrganizationRoleRequest,
  type ChangeCompetitionRoleRequest,
  type CompetitionRoleAssignmentDto,
  type EffectiveAccessDto,
  type ListAccessGrantsQuery,
  type ListAccessGrantsResponse,
  type ManageSuperuserRequest,
  type OrganizationRoleAssignmentDto,
  type PermissionDto,
  type PlatformRoleAssignmentDto,
  type UpsertAccessGrantRequest,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createAuthorizationResource(http: HttpClient) {
  return {
    async getEffectiveAccess(
      scope: AuthorizationScopeDto,
      permissions?: readonly PermissionDto[],
      options: RequestOptions = {},
    ): Promise<EffectiveAccessDto> {
      const query = scopeQuery(scope);
      if (permissions?.length) query.set("permissions", permissions.join(","));
      return http.request({
        path: `/authorization/effective-access?${query.toString()}`,
        method: "GET",
        options,
        parse: (data) => effectiveAccessSchema.parse(data),
      });
    },

    async upsertGrant(
      input: UpsertAccessGrantRequest,
      options: RequestOptions = {},
    ): Promise<AccessGrantDto> {
      const body = upsertAccessGrantRequestSchema.parse(input);
      return http.request({
        path: "/authorization/grants",
        method: "PUT",
        body,
        options,
        parse: (data) => accessGrantSchema.parse(data),
      });
    },

    async listGrants(
      input: ListAccessGrantsQuery,
      options: RequestOptions = {},
    ): Promise<ListAccessGrantsResponse> {
      const parsed = listAccessGrantsQuerySchema.parse(input);
      const query = scopeQuery(parsed);
      query.set("scopeType", parsed.scopeType);
      query.set("scopeId", parsed.scopeId);
      if (parsed.targetActorId) query.set("targetActorId", parsed.targetActorId);
      return http.request({
        path: `/authorization/grants?${query.toString()}`,
        method: "GET",
        options,
        parse: (data) => listAccessGrantsResponseSchema.parse(data),
      });
    },

    async deleteGrant(
      grantId: string,
      scope: AuthorizationScopeDto,
      reason?: string,
      options: RequestOptions = {},
    ): Promise<void> {
      const query = scopeQuery(scope);
      if (reason) query.set("reason", reason);
      return http.request({
        path: `${apiPath("authorization", "grants", grantId)}?${query.toString()}`,
        method: "DELETE",
        options,
        parse: () => undefined,
      });
    },

    async changeOrganizationRole(
      organizationId: string,
      actorId: string,
      input: ChangeOrganizationRoleRequest,
      options: RequestOptions = {},
    ): Promise<OrganizationRoleAssignmentDto> {
      const body = changeOrganizationRoleRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "members", actorId, "role"),
        method: "PATCH",
        body,
        options,
        parse: (data) => organizationRoleAssignmentSchema.parse(data),
      });
    },

    async changeCompetitionRole(
      organizationId: string,
      competitionId: string,
      actorId: string,
      input: ChangeCompetitionRoleRequest,
      options: RequestOptions = {},
    ): Promise<CompetitionRoleAssignmentDto> {
      const body = changeCompetitionRoleRequestSchema.parse(input);
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "members",
          actorId,
          "role",
        ),
        method: "PATCH",
        body,
        options,
        parse: (data) => competitionRoleAssignmentSchema.parse(data),
      });
    },

    async assignSuperuser(
      actorId: string,
      input: ManageSuperuserRequest = {},
      options: RequestOptions = {},
    ): Promise<PlatformRoleAssignmentDto> {
      const body = manageSuperuserRequestSchema.parse(input);
      return http.request({
        path: apiPath("authorization", "superusers", actorId),
        method: "PUT",
        body,
        options,
        parse: (data) => platformRoleAssignmentSchema.parse(data),
      });
    },

    async revokeSuperuser(
      actorId: string,
      reason?: string,
      options: RequestOptions = {},
    ): Promise<void> {
      const query = new URLSearchParams();
      if (reason) query.set("reason", reason);
      const suffix = query.size ? `?${query.toString()}` : "";
      return http.request({
        path: `${apiPath("authorization", "superusers", actorId)}${suffix}`,
        method: "DELETE",
        options,
        parse: () => undefined,
      });
    },
  };
}

function scopeQuery(scope: AuthorizationScopeDto): URLSearchParams {
  const query = new URLSearchParams();
  if (scope.organizationId) query.set("organizationId", scope.organizationId);
  if (scope.competitionId) query.set("competitionId", scope.competitionId);
  if (scope.teamId) query.set("teamId", scope.teamId);
  if (scope.encounterId) query.set("encounterId", scope.encounterId);
  return query;
}

export type AuthorizationResource = ReturnType<typeof createAuthorizationResource>;
