import {
  err,
  isIanaTimeZone,
  ok,
  type ActorId,
  type AuthorizationPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  normalizeOrganizationName,
  type Organization,
} from "../../domain/entities/organization.ts";
import {
  OrganizationForbidden,
  OrganizationNotFound,
} from "../../domain/errors/invitation.errors.ts";
import {
  InvalidOrganizationName,
  InvalidOrganizationSlug,
  InvalidOrganizationTimeZone,
  OrganizationNameConflict,
  OrganizationSlugConflict,
} from "../../domain/errors/organization.errors.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import { parseOrganizationSlug } from "../../domain/value-objects/organization-slug.ts";

export interface UpdateOrganizationProfileInput {
  readonly organizationId: OrganizationId;
  readonly actorId: ActorId;
  /** Omitted fields keep their current value. */
  readonly name?: string;
  readonly slug?: string;
  readonly timeZone?: string;
}

export type UpdateOrganizationProfileError =
  | OrganizationNotFound
  | OrganizationForbidden
  | InvalidOrganizationName
  | OrganizationNameConflict
  | InvalidOrganizationSlug
  | OrganizationSlugConflict
  | InvalidOrganizationTimeZone;

export class UpdateOrganizationProfileUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: UpdateOrganizationProfileInput,
  ): Promise<Result<Organization, UpdateOrganizationProfileError>> {
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

    let name = current.name;
    let normalizedName = current.normalizedName;
    if (input.name !== undefined) {
      name = input.name.trim();
      if (name.length === 0 || name.length > 120) {
        return err(
          new InvalidOrganizationName({
            code: "organizations.invalid_name",
            message: "Organization name is required",
          }),
        );
      }
      normalizedName = normalizeOrganizationName(name);
      const owner = await this.deps.organizations.getByNormalizedName(normalizedName);
      if (owner && owner.id !== current.id) return err(nameConflict());
    }

    let slug = current.slug;
    if (input.slug !== undefined) {
      const parsed = parseOrganizationSlug(input.slug);
      if (!parsed) {
        return err(
          new InvalidOrganizationSlug({
            code: "organizations.invalid_slug",
            message: "Organization slug is not valid",
          }),
        );
      }
      const owner = await this.deps.organizations.getBySlug(parsed);
      if (owner && owner.id !== current.id) return err(slugConflict());
      slug = parsed;
    }

    let timeZone = current.timeZone;
    if (input.timeZone !== undefined) {
      timeZone = input.timeZone.trim();
      if (!isIanaTimeZone(timeZone)) {
        return err(
          new InvalidOrganizationTimeZone({
            code: "organizations.invalid_time_zone",
            message: "Organization time zone must be an IANA time zone",
          }),
        );
      }
    }

    const persisted = await this.deps.organizations.update({
      ...current,
      name,
      normalizedName,
      slug,
      timeZone,
    });
    if (persisted) return ok(persisted);

    // Lost a race: another organization took the name or slug after the checks above.
    const nameOwner = await this.deps.organizations.getByNormalizedName(normalizedName);
    if (nameOwner && nameOwner.id !== current.id) return err(nameConflict());
    return err(slugConflict());
  }
}

function nameConflict(): OrganizationNameConflict {
  return new OrganizationNameConflict({
    code: "organizations.name_conflict",
    message: "Organization name is already in use",
  });
}

function slugConflict(): OrganizationSlugConflict {
  return new OrganizationSlugConflict({
    code: "organizations.slug_conflict",
    message: "Organization slug is already in use",
  });
}
