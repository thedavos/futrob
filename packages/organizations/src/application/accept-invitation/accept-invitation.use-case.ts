import {
  err,
  ok,
  type Result,
  type ActorId,
  type ClockPort,
  type CompetitionId,
} from "@futrob/shared-kernel";
import type { InvitationRepository } from "../../domain/ports/invitation.repository.ts";
import type { InvitationTokenPort } from "../../domain/ports/invitation-token.port.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import type { MembershipSummary } from "../../domain/value-objects/post-auth-destination.ts";
import type {
  CompetitionInviteRole,
  OrgMembershipRole,
} from "../../domain/value-objects/organization-membership-role.ts";
import { isCompetitionInviteRole } from "../../domain/value-objects/organization-membership-role.ts";
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
import { assessInvitationEligibility } from "../../domain/policies/invitation-eligibility.ts";

export interface AcceptedInvitation extends MembershipSummary {
  readonly competitionId: CompetitionId | null;
  readonly competitionRole: CompetitionInviteRole | null;
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
    const tokenHash = this.deps.tokens.hashToken(input.token.trim());
    const invitation = await this.deps.invitations.findByTokenHash(tokenHash);

    if (!invitation) {
      return err(
        new InvitationNotFound({
          code: "organizations.invitation_not_found",
          message: "Invitation not found",
        }),
      );
    }
    const now = this.deps.clock.now();
    const actorAlreadyRedeemed =
      invitation.redeemPolicy === REDEEM_POLICY.multi
        ? await this.deps.invitations.hasRedemption(invitation.id, input.actorId)
        : false;
    const eligible = assessInvitationEligibility({
      invitation,
      actorId: input.actorId,
      actorAlreadyRedeemed,
      now,
      requireCompetition: input.requireCompetition ?? false,
    });
    if (!eligible.isOk()) {
      if (invitation.status === INVITATION_STATUS.pending) {
        if (InvitationExpired.is(eligible.error)) {
          await this.deps.invitations.update({
            ...invitation,
            status: INVITATION_STATUS.expired,
          });
        }
      }
      return err(eligible.error);
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

    if (invitation.status === INVITATION_STATUS.accepted) {
      return this.acceptedResult(organization, invitation, input.actorId);
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
    const membershipRole = membershipRoleForInvitation(claimed);
    if (!existing) {
      await this.deps.memberships.add({
        organizationId: claimed.organizationId,
        actorId,
        role: membershipRole,
        createdAt: now,
      });
    }

    return ok({
      organizationId: organization.id,
      organizationName: organization.name,
      role: existing?.role ?? membershipRole,
      competitionId: claimed.competitionId ?? null,
      competitionRole: competitionRoleForInvitation(claimed),
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
        role: membershipRoleForInvitation(invitation),
        competitionId: invitation.competitionId ?? null,
        competitionRole: competitionRoleForInvitation(invitation),
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

function membershipRoleForInvitation(invitation: OrganizationInvitation): OrgMembershipRole {
  if (invitation.competitionId) {
    return "member";
  }
  return invitation.role === "staff" ? "staff" : "member";
}

function competitionRoleForInvitation(
  invitation: OrganizationInvitation,
): CompetitionInviteRole | null {
  if (!invitation.competitionId || !isCompetitionInviteRole(invitation.role)) {
    return null;
  }
  return invitation.role;
}
