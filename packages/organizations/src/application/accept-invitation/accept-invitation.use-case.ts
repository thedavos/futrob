import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ActorId, ClockPort } from "@futrob/shared-kernel";
import type { InvitationRepository } from "../../domain/ports/invitation.repository.ts";
import type { InvitationTokenPort } from "../../domain/ports/invitation-token.port.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import type { MembershipSummary } from "../../domain/value-objects/post-auth-destination.ts";
import {
  InvitationExpired,
  InvitationInvalid,
  InvitationNotFound,
  InvitationRevoked,
  OrganizationNotFound,
  type AcceptInvitationError,
} from "../../domain/errors/invitation.errors.ts";

export interface AcceptedInvitation extends MembershipSummary {
  readonly competitionId: import("@futrob/shared-kernel").CompetitionId | null;
  readonly competitionRole: import("../../domain/value-objects/organization-membership-role.ts").InviteRole;
}

export interface AcceptInvitationInput {
  readonly token: string;
  readonly actorId: ActorId;
  readonly requireCompetition?: boolean;
}

export class AcceptInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly memberships: MembershipRepository;
      readonly invitations: InvitationRepository;
      readonly clock: ClockPort;
      readonly tokens: InvitationTokenPort;
    },
  ) {}

  async execute(
    input: AcceptInvitationInput,
  ): Promise<Result<AcceptedInvitation, AcceptInvitationError>> {
    const tokenHash = this.deps.tokens.hashToken(input.token);
    const invitation = await this.deps.invitations.findByTokenHash(tokenHash);

    if (!invitation) {
      return err(
        new InvitationNotFound({
          code: "organizations.invitation_not_found",
          message: "Invitation not found",
        }),
      );
    }
    if (input.requireCompetition && !invitation.competitionId) {
      return err(
        new InvitationInvalid({
          code: "organizations.invitation_invalid",
          message: "Invitation does not target a competition",
        }),
      );
    }

    const organization = await this.deps.organizations.getById(invitation.organizationId);
    if (!organization) {
      return err(
        new OrganizationNotFound({
          code: "organizations.not_found",
          message: "Organization not found",
          organizationId: invitation.organizationId,
        }),
      );
    }

    if (invitation.status === "revoked") {
      return err(
        new InvitationRevoked({
          code: "organizations.invitation_revoked",
          message: "Invitation has been revoked",
        }),
      );
    }

    const now = this.deps.clock.now();
    if (invitation.status === "expired" || invitation.expiresAt.getTime() <= now.getTime()) {
      if (invitation.status === "pending") {
        await this.deps.invitations.update({ ...invitation, status: "expired" });
      }
      return err(
        new InvitationExpired({
          code: "organizations.invitation_expired",
          message: "Invitation has expired",
        }),
      );
    }

    if (invitation.status === "accepted") {
      if (invitation.acceptedByActorId === input.actorId) {
        return ok({
          organizationId: organization.id,
          organizationName: organization.name,
          role: invitation.role,
          competitionId: invitation.competitionId ?? null,
          competitionRole: invitation.role,
        });
      }
      return err(
        new InvitationInvalid({
          code: "organizations.invitation_invalid",
          message: "Invitation is no longer valid",
        }),
      );
    }

    if (invitation.status !== "pending") {
      return err(
        new InvitationInvalid({
          code: "organizations.invitation_invalid",
          message: "Invitation is no longer valid",
        }),
      );
    }

    const existing = await this.deps.memberships.findByOrgAndActor(
      invitation.organizationId,
      input.actorId,
    );
    if (!existing) {
      await this.deps.memberships.add({
        organizationId: invitation.organizationId,
        actorId: input.actorId,
        role: invitation.role,
        createdAt: now,
      });
    }

    await this.deps.invitations.update({
      ...invitation,
      status: "accepted",
      acceptedByActorId: input.actorId,
    });

    return ok({
      organizationId: organization.id,
      organizationName: organization.name,
      role: existing?.role ?? invitation.role,
      competitionId: invitation.competitionId ?? null,
      competitionRole: invitation.role,
    });
  }
}
