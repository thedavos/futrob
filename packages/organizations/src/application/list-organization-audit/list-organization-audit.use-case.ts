import { ok, type ActorId, type AuthorizationPort } from "@futrob/shared-kernel";
import type {
  OrganizationAuditQuery,
  OrganizationAuditReaderPort,
} from "../../domain/ports/organization-audit.reader.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";
import { RequirePermissionUseCase } from "../require-permission/require-permission.use-case.ts";

export class ListOrganizationAuditUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
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
    return ok(await this.deps.audit.read(input.query));
  }
}
