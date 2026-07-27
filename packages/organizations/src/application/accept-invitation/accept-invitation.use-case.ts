import { domainError, err, ok, type DomainError, type Result } from "@futrob/shared-kernel";
import type { ActorId } from "@futrob/shared-kernel";
import type { ClockPort } from "../../domain/ports/clock.port.ts";
import type { InvitationRepository } from "../../domain/ports/invitation.repository.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import type { TokenPort } from "../../domain/ports/token.port.ts";
import type { MembershipSummary } from "../../domain/value-objects/post-auth-destination.ts";

export interface AcceptInvitationInput {
  readonly token: string;
  readonly actorId: ActorId;
}

export class AcceptInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly memberships: MembershipRepository;
      readonly invitations: InvitationRepository;
      readonly clock: ClockPort;
      readonly tokens: TokenPort;
    },
  ) {}

  async execute(input: AcceptInvitationInput): Promise<Result<MembershipSummary, DomainError>> {
    const tokenHash = this.deps.tokens.hashToken(input.token);
    const invitation = await this.deps.invitations.findByTokenHash(tokenHash);

    if (!invitation) {
      return err(domainError("organizations.invitation_not_found", "Invitation not found"));
    }

    const organization = await this.deps.organizations.getById(invitation.organizationId);
    if (!organization) {
      return err(
        domainError("organizations.not_found", "Organization not found", {
          organizationId: invitation.organizationId,
        }),
      );
    }

    const existing = await this.deps.memberships.findByOrgAndActor(
      invitation.organizationId,
      input.actorId,
    );
    if (existing) {
      return ok({
        organizationId: organization.id,
        organizationName: organization.name,
        role: existing.role,
      });
    }

    if (invitation.status === "revoked") {
      return err(domainError("organizations.invitation_revoked", "Invitation has been revoked"));
    }

    const now = this.deps.clock.now();
    if (invitation.status === "expired" || invitation.expiresAt.getTime() <= now.getTime()) {
      if (invitation.status === "pending") {
        await this.deps.invitations.update({ ...invitation, status: "expired" });
      }
      return err(domainError("organizations.invitation_expired", "Invitation has expired"));
    }

    if (invitation.status === "accepted") {
      if (invitation.acceptedByActorId === input.actorId) {
        return ok({
          organizationId: organization.id,
          organizationName: organization.name,
          role: invitation.role,
        });
      }
      return err(domainError("organizations.invitation_invalid", "Invitation is no longer valid"));
    }

    if (invitation.status !== "pending") {
      return err(domainError("organizations.invitation_invalid", "Invitation is no longer valid"));
    }

    await this.deps.memberships.add({
      organizationId: invitation.organizationId,
      actorId: input.actorId,
      role: invitation.role,
      createdAt: now,
    });

    await this.deps.invitations.update({
      ...invitation,
      status: "accepted",
      acceptedByActorId: input.actorId,
    });

    return ok({
      organizationId: organization.id,
      organizationName: organization.name,
      role: invitation.role,
    });
  }
}
