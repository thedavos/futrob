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
import { InvalidOrganizationLogo } from "../../domain/errors/organization.errors.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import {
  parseOrganizationLogo,
  type OrganizationLogoInput,
} from "../../domain/value-objects/organization-logo.ts";

export interface SetOrganizationLogoInput {
  readonly organizationId: OrganizationId;
  readonly actorId: ActorId;
  readonly logo: OrganizationLogoInput;
}

export type SetOrganizationLogoError =
  | OrganizationNotFound
  | OrganizationForbidden
  | InvalidOrganizationLogo;

export class SetOrganizationLogoUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: SetOrganizationLogoInput,
  ): Promise<Result<Organization, SetOrganizationLogoError>> {
    const current = await this.deps.organizations.getById(input.organizationId);
    if (!current) {
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
      permission: ORGANIZATION_PERMISSION.update,
      scope: { organizationId: input.organizationId },
    });
    if (!decision.allowed) {
      return err(
        new OrganizationForbidden({
          code: "organizations.forbidden",
          message: "The actor cannot update this organization",
        }),
      );
    }

    const logo = parseOrganizationLogo(input.logo, input.organizationId);
    if (!logo) {
      return err(
        new InvalidOrganizationLogo({
          code: "organizations.invalid_logo",
          message: "Organization logo must be a monogram or an upload under its own prefix",
        }),
      );
    }

    // Only the logo is written; other fields changed meanwhile stay as they are.
    const persisted = await this.deps.organizations.update(current.id, { logo });
    // The name and slug are unchanged, so the repository only returns null if the row vanished.
    return persisted
      ? ok(persisted)
      : err(
          new OrganizationNotFound({
            code: "organizations.not_found",
            message: "Organization not found",
            organizationId: input.organizationId,
          }),
        );
  }
}
