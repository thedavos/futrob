import { domainError, err, ok, type DomainError, type Result } from "@futrob/shared-kernel";
import type { ActorId, ClockPort, IdGeneratorPort, OrganizationId } from "@futrob/shared-kernel";
import type { InvitationRepository } from "../../domain/ports/invitation.repository.ts";
import type { InvitationTokenPort } from "../../domain/ports/invitation-token.port.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import { isInviteRole } from "../../domain/value-objects/organization-membership-role.ts";

const DEFAULT_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInvitationInput {
  readonly organizationId: OrganizationId;
  readonly role: string;
  readonly invitedByActorId: ActorId;
  readonly email?: string;
  readonly expiresInMs?: number;
}

export interface CreateInvitationResult {
  readonly invitationId: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export class CreateInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly memberships: MembershipRepository;
      readonly invitations: InvitationRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly tokens: InvitationTokenPort;
    },
  ) {}

  async execute(
    input: CreateInvitationInput,
  ): Promise<Result<CreateInvitationResult, DomainError>> {
    if (!isInviteRole(input.role)) {
      return err(
        domainError(
          "organizations.invalid_role",
          "Invitation role must be staff, captain, or player",
          {
            role: input.role,
          },
        ),
      );
    }

    const organization = await this.deps.organizations.getById(input.organizationId);
    if (!organization) {
      return err(
        domainError("organizations.not_found", "Organization not found", {
          organizationId: input.organizationId,
        }),
      );
    }

    const inviter = await this.deps.memberships.findByOrgAndActor(
      input.organizationId,
      input.invitedByActorId,
    );
    if (!inviter || (inviter.role !== "organizer" && inviter.role !== "staff")) {
      return err(
        domainError("organizations.forbidden", "Only organizer or staff can create invitations"),
      );
    }

    const now = this.deps.clock.now();
    const expiresInMs = input.expiresInMs ?? DEFAULT_EXPIRES_IN_MS;
    const expiresAt = new Date(now.getTime() + expiresInMs);
    const invitationId = this.deps.ids.generate();
    const token = this.deps.tokens.generatePlainToken();
    const tokenHash = this.deps.tokens.hashToken(token);

    await this.deps.invitations.create({
      id: invitationId,
      organizationId: input.organizationId,
      role: input.role,
      tokenHash,
      email: input.email ?? null,
      status: "pending",
      invitedByActorId: input.invitedByActorId,
      expiresAt,
      acceptedByActorId: null,
      createdAt: now,
    });

    return ok({ invitationId, token, expiresAt });
  }
}
