import {
  err,
  ok,
  type ActorId,
  type ClockPort,
  type Result,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import {
  isCompetitionInviteRole,
  type CompetitionInviteRole,
} from "../../domain/value-objects/organization-membership-role.ts";
import type { InvitationRepository } from "../../domain/ports/invitation.repository.ts";
import type { InvitationTokenPort } from "../../domain/ports/invitation-token.port.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import { InvitationInvalid, InvitationNotFound } from "../../domain/errors/invitation.errors.ts";
import { REDEEM_POLICY } from "../../domain/entities/organization-invitation.ts";
import {
  assessInvitationEligibility,
  type InvitationEligibilityError,
} from "../../domain/policies/invitation-eligibility.ts";

export interface InspectCompetitionInvitationInput {
  readonly token: string;
  readonly actorId: ActorId;
}

export type InspectCompetitionInvitationError = InvitationNotFound | InvitationEligibilityError;

export interface InspectedCompetitionInvitation {
  readonly organizationId: OrganizationId;
  readonly organizationName: string;
  readonly competitionId: CompetitionId;
  readonly competitionRole: CompetitionInviteRole;
  readonly expiresAt: Date;
}

export class InspectCompetitionInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly invitations: InvitationRepository;
      readonly clock: ClockPort;
      readonly tokens: InvitationTokenPort;
    },
  ) {}

  async execute(
    input: InspectCompetitionInvitationInput,
  ): Promise<Result<InspectedCompetitionInvitation, InspectCompetitionInvitationError>> {
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

    const actorAlreadyRedeemed =
      invitation.redeemPolicy === REDEEM_POLICY.multi
        ? await this.deps.invitations.hasRedemption(invitation.id, input.actorId)
        : false;
    const eligible = assessInvitationEligibility({
      invitation,
      actorId: input.actorId,
      actorAlreadyRedeemed,
      now: this.deps.clock.now(),
      requireCompetition: true,
    });
    if (!eligible.isOk()) return eligible;

    const competitionId = invitation.competitionId;
    if (!competitionId || !isCompetitionInviteRole(invitation.role)) {
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
        new InvitationInvalid({
          code: "organizations.invitation_invalid",
          message: "Invitation organization is unavailable",
        }),
      );
    }

    return ok({
      organizationId: organization.id,
      organizationName: organization.name,
      competitionId,
      competitionRole: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  }
}
