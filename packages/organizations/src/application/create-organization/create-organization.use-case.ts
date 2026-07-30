import {
  asOrganizationId,
  domainError,
  err,
  ok,
  type DomainError,
  type Result,
} from "@futrob/shared-kernel";
import type { ActorId, ClockPort, IdGeneratorPort } from "@futrob/shared-kernel";
import type { Organization } from "../../domain/entities/organization.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";

export interface CreateOrganizationInput {
  readonly name: string;
  readonly actorId: ActorId;
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
  ): Promise<Result<CreateOrganizationResult, DomainError>> {
    const name = input.name.trim();
    if (name.length === 0) {
      return err(domainError("organizations.invalid_name", "Organization name is required"));
    }

    const now = this.deps.clock.now();
    const organizationId = asOrganizationId(this.deps.ids.generate());
    const organization: Organization = {
      id: organizationId,
      name,
      createdAt: now,
      createdByActorId: input.actorId,
    };

    await this.deps.organizations.create(organization);
    await this.deps.memberships.add({
      organizationId,
      actorId: input.actorId,
      role: "organizer",
      createdAt: now,
    });

    return ok({ organization, role: "organizer" });
  }
}
