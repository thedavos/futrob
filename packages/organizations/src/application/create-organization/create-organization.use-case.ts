import {
  asOrganizationId,
  err,
  isIanaTimeZone,
  ok,
  type Result,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
} from "@futrob/shared-kernel";
import {
  normalizeOrganizationName,
  type Organization,
} from "../../domain/entities/organization.ts";
import {
  InvalidOrganizationName,
  InvalidOrganizationSlug,
  InvalidOrganizationTimeZone,
  OrganizationCreationKeyConflict,
  OrganizationNameConflict,
  OrganizationSlugConflict,
  type CreateOrganizationError,
} from "../../domain/errors/organization.errors.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import { DEFAULT_ORGANIZATION_LOGO } from "../../domain/value-objects/organization-logo.ts";
import {
  organizationSlugCandidates,
  parseOrganizationSlug,
  type OrganizationSlug,
} from "../../domain/value-objects/organization-slug.ts";

/** How many numbered variants of a derived slug are tried before giving up. */
const MAX_DERIVED_SLUG_ATTEMPTS = 50;

export interface CreateOrganizationInput {
  readonly name: string;
  readonly actorId: ActorId;
  /** IANA zone, the initial value for the organization's new competitions. */
  readonly timeZone: string;
  /** Derived from the name, with a numeric suffix when taken, when omitted. */
  readonly slug?: string;
  readonly creationKey?: string;
}

export interface CreateOrganizationResult {
  readonly organization: Organization;
  readonly role: "organizer";
}

export class CreateOrganizationUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly memberships: MembershipRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: CreateOrganizationInput,
  ): Promise<Result<CreateOrganizationResult, CreateOrganizationError>> {
    const name = input.name.trim();
    if (name.length === 0 || name.length > 120) {
      return err(
        new InvalidOrganizationName({
          code: "organizations.invalid_name",
          message: "Organization name is required",
        }),
      );
    }

    const timeZone = input.timeZone.trim();
    if (!isIanaTimeZone(timeZone)) {
      return err(
        new InvalidOrganizationTimeZone({
          code: "organizations.invalid_time_zone",
          message: "Organization time zone must be an IANA time zone",
        }),
      );
    }

    const explicitSlug = input.slug === undefined ? null : parseOrganizationSlug(input.slug);
    if (input.slug !== undefined && !explicitSlug) {
      return err(
        new InvalidOrganizationSlug({
          code: "organizations.invalid_slug",
          message: "Organization slug is not valid",
        }),
      );
    }

    const normalizedName = normalizeOrganizationName(name);

    const idempotent = input.creationKey
      ? await this.deps.organizations.getByCreationKey(input.creationKey)
      : null;
    if (idempotent) {
      // A retry returns what the first attempt created; the same key with another request is a
      // different organization the caller did not mean to replay.
      const sameRequest =
        idempotent.normalizedName === normalizedName &&
        idempotent.timeZone === timeZone &&
        (explicitSlug === null || idempotent.slug === explicitSlug);
      if (!sameRequest) {
        return err(
          new OrganizationCreationKeyConflict({
            code: "organizations.creation_key_conflict",
            message: "The creation key was already used for a different organization",
          }),
        );
      }
      await this.deps.memberships.add({
        organizationId: idempotent.id,
        actorId: input.actorId,
        role: "organizer",
        createdAt: this.deps.clock.now(),
      });
      return ok({ organization: idempotent, role: "organizer" });
    }

    if (await this.deps.organizations.getByNormalizedName(normalizedName)) {
      return err(nameConflict());
    }

    const now = this.deps.clock.now();
    const organizationId = asOrganizationId(this.deps.ids.generate());

    for (const slug of explicitSlug ? [explicitSlug] : derivedSlugs(name)) {
      if (await this.deps.organizations.getBySlug(slug)) {
        if (explicitSlug) return err(slugConflict());
        continue;
      }

      const persisted = await this.deps.organizations.create({
        id: organizationId,
        name,
        normalizedName,
        slug,
        timeZone,
        logo: DEFAULT_ORGANIZATION_LOGO,
        createdAt: now,
        createdByActorId: input.actorId,
        creationKey: input.creationKey,
      });
      if (persisted) {
        await this.deps.memberships.add({
          organizationId: persisted.id,
          actorId: input.actorId,
          role: "organizer",
          createdAt: now,
        });
        return ok({ organization: persisted, role: "organizer" });
      }

      // Lost a race: either the name or the slug was taken after the checks above.
      if (await this.deps.organizations.getByNormalizedName(normalizedName)) {
        return err(nameConflict());
      }
      if (explicitSlug) return err(slugConflict());
    }

    return err(slugConflict());
  }
}

function derivedSlugs(name: string): OrganizationSlug[] {
  const slugs: OrganizationSlug[] = [];
  for (const candidate of organizationSlugCandidates(name)) {
    slugs.push(candidate);
    if (slugs.length === MAX_DERIVED_SLUG_ATTEMPTS) break;
  }
  return slugs;
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
