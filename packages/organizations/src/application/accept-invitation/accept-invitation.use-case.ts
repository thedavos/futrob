import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ActorId, ClockPort } from "@futrob/shared-kernel";
import type { InvitationRepository } from "../../domain/ports/invitation.repository.ts";
import type { InvitationTokenPort } from "../../domain/ports/invitation-token.port.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import type { MembershipSummary } from "../../domain/value-objects/post-auth-destination.ts";
import type { Organization } from "../../domain/entities/organization.ts";
import {
  INVITATION_STATUS,
  REDEEM_POLICY,
  type OrganizationInvitation,
} from "../../domain/entities/organization-invitation.ts";
import {
  InvitationExhausted,
  InvitationExpired,
  InvitationInvalid,
  InvitationNotFound,
  InvitationRevoked,
  OrganizationNotFound,
  type AcceptInvitationError,
} from "../../domain/errors/invitation.errors.ts";

export interface AcceptedInvitation extends MembershipSummary {
  readonly competitionId: import("@futrob/shared-kernel").CompetitionId | null;
  readonly competitionRole:
    | import("../../domain/value-objects/organization-membership-role.ts").CompetitionInviteRole
    | null;
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

    if (invitation.status === INVITATION_STATUS.revoked) {
      return err(
        new InvitationRevoked({
          code: "organizations.invitation_revoked",
          message: "Invitation has been revoked",
        }),
      );
    }

    const now = this.deps.clock.now();
    if (
      invitation.status === INVITATION_STATUS.expired ||
      invitation.expiresAt.getTime() <= now.getTime()
    ) {
      if (invitation.status === INVITATION_STATUS.pending) {
        await this.deps.invitations.update({
          ...invitation,
          status: INVITATION_STATUS.expired,
        });
      }
      return err(
        new InvitationExpired({
          code: "organizations.invitation_expired",
          message: "Invitation has expired",
        }),
      );
    }

    if (invitation.status === INVITATION_STATUS.accepted) {
      return this.acceptedResult(organization, invitation, input.actorId);
    }

    if (invitation.status !== INVITATION_STATUS.pending) {
      return err(
        new InvitationInvalid({
          code: "organizations.invitation_invalid",
          message: "Invitation is no longer valid",
        }),
      );
    }

    const claimed =
      invitation.redeemPolicy === REDEEM_POLICY.multi
        ? await this.claimMulti(tokenHash, input.actorId, now)
        : await this.claimSingle(tokenHash, input.actorId, now);
    if (!claimed.isOk()) {
      return claimed;
    }

    return this.finalizeAcceptance(organization, claimed.value, input.actorId, now);
  }

  private async claimSingle(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<Result<OrganizationInvitation, AcceptInvitationError>> {
    const claimed = await this.deps.invitations.claimPending(tokenHash, actorId, now);
    if (claimed) return ok(claimed);

    const current = await this.deps.invitations.findByTokenHash(tokenHash);
    return this.diagnoseClaimFailure(current, actorId, now);
  }

  private async claimMulti(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<Result<OrganizationInvitation, AcceptInvitationError>> {
    const claim = await this.deps.invitations.claimRedemption(tokenHash, actorId, now);
    if (claim) return ok(claim.invitation);

    const current = await this.deps.invitations.findByTokenHash(tokenHash);
    if (
      current &&
      current.status === INVITATION_STATUS.pending &&
      current.expiresAt.getTime() > now.getTime() &&
      current.redeemPolicy === REDEEM_POLICY.multi &&
      current.maxRedemptions !== null &&
      current.redeemedCount >= current.maxRedemptions
    ) {
      return err(
        new InvitationExhausted({
          code: "organizations.invitation_exhausted",
          message: "Invitation has reached its maximum number of redemptions",
        }),
      );
    }
    return this.diagnoseClaimFailure(current, actorId, now);
  }

  /** Shared diagnosis once an atomic claim primitive reports no eligible row. */
  private diagnoseClaimFailure(
    current: OrganizationInvitation | null,
    actorId: ActorId,
    now: Date,
  ): Result<OrganizationInvitation, AcceptInvitationError> {
    if (!current) {
      return err(
        new InvitationNotFound({
          code: "organizations.invitation_not_found",
          message: "Invitation not found",
        }),
      );
    }
    if (current.status === INVITATION_STATUS.revoked) {
      return err(
        new InvitationRevoked({
          code: "organizations.invitation_revoked",
          message: "Invitation has been revoked",
        }),
      );
    }
    if (
      current.status === INVITATION_STATUS.expired ||
      current.expiresAt.getTime() <= now.getTime()
    ) {
      return err(
        new InvitationExpired({
          code: "organizations.invitation_expired",
          message: "Invitation has expired",
        }),
      );
    }
    if (current.status === INVITATION_STATUS.accepted) {
      if (current.acceptedByActorId === actorId) {
        return ok(current);
      }
      return err(
        new InvitationInvalid({
          code: "organizations.invitation_invalid",
          message: "Invitation is no longer valid",
        }),
      );
    }
    return err(
      new InvitationInvalid({
        code: "organizations.invitation_invalid",
        message: "Invitation is no longer valid",
      }),
    );
  }

  private async finalizeAcceptance(
    organization: Organization,
    claimed: OrganizationInvitation,
    actorId: ActorId,
    now: Date,
  ): Promise<Result<AcceptedInvitation, AcceptInvitationError>> {
    const existing = await this.deps.memberships.findByOrgAndActor(claimed.organizationId, actorId);
    const membershipRole = claimed.competitionId ? "member" : claimed.role;
    if (!existing) {
      await this.deps.memberships.add({
        organizationId: claimed.organizationId,
        actorId,
        role: membershipRole as import("../../domain/value-objects/organization-membership-role.ts").OrgMembershipRole,
        createdAt: now,
      });
    }

    return ok({
      organizationId: organization.id,
      organizationName: organization.name,
      role:
        existing?.role ??
        (membershipRole as import("../../domain/value-objects/organization-membership-role.ts").OrgMembershipRole),
      competitionId: claimed.competitionId ?? null,
      competitionRole: claimed.competitionId
        ? (claimed.role as import("../../domain/value-objects/organization-membership-role.ts").CompetitionInviteRole)
        : null,
    });
  }

  private acceptedResult(
    organization: Organization,
    invitation: OrganizationInvitation,
    actorId: ActorId,
  ): Result<AcceptedInvitation, AcceptInvitationError> {
    if (invitation.acceptedByActorId === actorId) {
      return ok({
        organizationId: organization.id,
        organizationName: organization.name,
        role: invitation.competitionId
          ? "member"
          : (invitation.role as import("../../domain/value-objects/organization-membership-role.ts").OrgMembershipRole),
        competitionId: invitation.competitionId ?? null,
        competitionRole: invitation.competitionId
          ? (invitation.role as import("../../domain/value-objects/organization-membership-role.ts").CompetitionInviteRole)
          : null,
      });
    }
    return err(
      new InvitationInvalid({
        code: "organizations.invitation_invalid",
        message: "Invitation is no longer valid",
      }),
    );
  }
}
