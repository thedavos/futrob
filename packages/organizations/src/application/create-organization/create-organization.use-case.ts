import {
  asOrganizationId,
  err,
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
  OrganizationNameConflict,
  type CreateOrganizationError,
} from "../../domain/errors/organization.errors.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";

export interface CreateOrganizationInput {
  readonly name: string;
  readonly actorId: ActorId;
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

    const idempotent = input.creationKey
      ? await this.deps.organizations.getByCreationKey(input.creationKey)
      : null;
    if (idempotent) {
      await this.deps.memberships.add({
        organizationId: idempotent.id,
        actorId: input.actorId,
        role: "organizer",
        createdAt: this.deps.clock.now(),
      });
      return ok({ organization: idempotent, role: "organizer" });
    }

    const normalizedName = normalizeOrganizationName(name);
    if (await this.deps.organizations.getByNormalizedName(normalizedName)) {
      return err(
        new OrganizationNameConflict({
          code: "organizations.name_conflict",
          message: "Organization name is already in use",
        }),
      );
    }

    const now = this.deps.clock.now();
    const organizationId = asOrganizationId(this.deps.ids.generate());
    const organization: Organization = {
      id: organizationId,
      name,
      normalizedName,
      createdAt: now,
      createdByActorId: input.actorId,
      creationKey: input.creationKey,
    };

    const persisted = await this.deps.organizations.create(organization);
    if (!persisted) {
      return err(
        new OrganizationNameConflict({
          code: "organizations.name_conflict",
          message: "Organization name is already in use",
        }),
      );
    }
    await this.deps.memberships.add({
      organizationId: persisted.id,
      actorId: input.actorId,
      role: "organizer",
      createdAt: now,
    });

    return ok({ organization: persisted, role: "organizer" });
  }
}
