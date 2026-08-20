import {
  err,
  ok,
  type Result,
  type ActorId,
  type ClockPort,
  type CompetitionId,
  type IdGeneratorPort,
  type OrganizationId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import type { InvitationRepository } from "../../domain/ports/invitation.repository.ts";
import type { InvitationTokenPort } from "../../domain/ports/invitation-token.port.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import {
  INVITATION_STATUS,
  REDEEM_POLICY,
  type RedeemPolicy,
} from "../../domain/entities/organization-invitation.ts";
import {
  isCompetitionInviteRole,
  isInviteRole,
  isOrganizationInviteRole,
  type InviteRole,
} from "../../domain/value-objects/organization-membership-role.ts";
import {
  InvalidInvitationRedeemPolicy,
  InvalidInvitationRole,
  OrganizationForbidden,
  OrganizationNotFound,
  type CreateInvitationError,
} from "../../domain/errors/invitation.errors.ts";

const DEFAULT_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInvitationInput {
  readonly organizationId: OrganizationId;
  readonly competitionId?: CompetitionId;
  readonly role: string;
  readonly invitedByActorId: ActorId;
  readonly email?: string;
  readonly expiresInMs?: number;
  /** Defaults to `single` (current 1:1 behavior) when omitted. */
  readonly redeemPolicy?: RedeemPolicy;
  /** Required and must be a positive integer when `redeemPolicy` is `multi`. */
  readonly maxRedemptions?: number;
}

export interface CreateInvitationResult {
  readonly invitationId: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly redeemPolicy: RedeemPolicy;
  readonly maxRedemptions: number | null;
}

export class CreateInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly memberships: MembershipRepository;
      readonly authorization: AuthorizationPort;
      readonly invitations: InvitationRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly tokens: InvitationTokenPort;
    },
  ) {}

  async execute(
    input: CreateInvitationInput,
  ): Promise<Result<CreateInvitationResult, CreateInvitationError>> {
    const validRole = input.competitionId
      ? isCompetitionInviteRole(input.role)
      : isOrganizationInviteRole(input.role);
    if (!validRole || !isInviteRole(input.role)) {
      return err(
        new InvalidInvitationRole({
          code: "organizations.invalid_role",
          message: input.competitionId
            ? "Competition invitation role must be staff, captain, or player"
            : "Organization invitation role must be staff or member",
          role: input.role,
        }),
      );
    }

    const inviteRole: InviteRole = input.role;
    const redeemPolicy = input.redeemPolicy ?? REDEEM_POLICY.single;
    if (redeemPolicy === REDEEM_POLICY.multi) {
      const maxRedemptionsValue = input.maxRedemptions;
      if (
        maxRedemptionsValue === undefined ||
        !Number.isInteger(maxRedemptionsValue) ||
        maxRedemptionsValue < 1
      ) {
        return err(
          new InvalidInvitationRedeemPolicy({
            code: "organizations.invalid_redeem_policy",
            message: "maxRedemptions must be a positive integer when redeemPolicy is multi",
          }),
        );
      }
    } else if (input.maxRedemptions !== undefined) {
      return err(
        new InvalidInvitationRedeemPolicy({
          code: "organizations.invalid_redeem_policy",
          message: "maxRedemptions requires redeemPolicy multi",
        }),
      );
    }

    const organization = await this.deps.organizations.getById(input.organizationId);
    if (!organization) {
      return err(
        new OrganizationNotFound({
          code: "organizations.not_found",
          message: "Organization not found",
          organizationId: input.organizationId,
        }),
      );
    }

    const authorization = await this.deps.authorization.decide({
      actorId: input.invitedByActorId,
      permission: input.competitionId
        ? "competitions.invitations.manage"
        : "organizations.invitations.manage",
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
      },
    });
    if (!authorization.allowed) {
      return err(
        new OrganizationForbidden({
          code: "organizations.forbidden",
          message: "The actor cannot create invitations in this scope",
        }),
      );
    }

    const now = this.deps.clock.now();
    const expiresInMs = input.expiresInMs ?? DEFAULT_EXPIRES_IN_MS;
    const expiresAt = new Date(now.getTime() + expiresInMs);
    const invitationId = this.deps.ids.generate();
    const token = this.deps.tokens.generatePlainToken();
    const tokenHash = this.deps.tokens.hashToken(token);
    const maxRedemptions =
      redeemPolicy === REDEEM_POLICY.multi ? (input.maxRedemptions ?? null) : null;

    await this.deps.invitations.create({
      id: invitationId,
      organizationId: input.organizationId,
      competitionId: input.competitionId ?? null,
      role: inviteRole,
      tokenHash,
      email: input.email ?? null,
      status: INVITATION_STATUS.pending,
      invitedByActorId: input.invitedByActorId,
      expiresAt,
      acceptedByActorId: null,
      createdAt: now,
      redeemPolicy,
      maxRedemptions,
      redeemedCount: 0,
    });

    return ok({ invitationId, token, expiresAt, redeemPolicy, maxRedemptions });
  }
}
