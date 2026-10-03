import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { Organization } from "../../domain/entities/organization.ts";
import {
  OrganizationForbidden,
  OrganizationNotFound,
} from "../../domain/errors/invitation.errors.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";

export interface GetOrganizationProfileInput {
  readonly organizationId: OrganizationId;
  readonly actorId: ActorId;
}

export class GetOrganizationProfileUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: GetOrganizationProfileInput,
  ): Promise<Result<Organization, OrganizationNotFound | OrganizationForbidden>> {
    const organization = await this.deps.organizations.getById(input.organizationId);
    if (!organization) {
      return err(
        new OrganizationNotFound({
          code: "organizations.not_found",
          message: "Organization not found",
          organizationId: input.organizationId,
        }),
      );
    }

    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.read,
      scope: { organizationId: input.organizationId },
    });
    if (!decision.allowed) {
      return err(
        new OrganizationForbidden({
          code: "organizations.forbidden",
          message: "The actor cannot read this organization",
        }),
      );
    }

    return ok(organization);
  }
}
