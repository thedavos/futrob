import {
  ok,
  type ActorId,
  type AuthorizationBatchPort,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import type {
  OrganizationAuditQuery,
  OrganizationAuditCompetitionReaderPort,
  OrganizationAuditReaderPort,
} from "../../domain/ports/organization-audit.reader.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";
import { RequirePermissionUseCase } from "../require-permission/require-permission.use-case.ts";

export class ListOrganizationAuditUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort & AuthorizationBatchPort;
      readonly competitions: OrganizationAuditCompetitionReaderPort;
      readonly audit: OrganizationAuditReaderPort;
    },
  ) {}

  async execute(input: { readonly actorId: ActorId; readonly query: OrganizationAuditQuery }) {
    const permission = await new RequirePermissionUseCase(this.deps.authorization).execute({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.auditTrailRead,
      scope: {
        organizationId: input.query.organizationId,
        competitionId: input.query.competitionId,
      },
    });
    if (permission.isErr()) return permission;
    const competitionIds = input.query.competitionId
      ? [input.query.competitionId]
      : await this.deps.competitions.listIdsByOrganization(input.query.organizationId);
    const decisions = await this.deps.authorization.decideEach({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.auditTrailRead,
      scopes: competitionIds.map((competitionId) => ({
        organizationId: input.query.organizationId,
        competitionId,
      })),
    });
    const accessibleCompetitionIds = decisions.flatMap((decision) =>
      decision.allowed && decision.scope.competitionId ? [decision.scope.competitionId] : [],
    );
    return ok(await this.deps.audit.read({ ...input.query, accessibleCompetitionIds }));
  }
}
