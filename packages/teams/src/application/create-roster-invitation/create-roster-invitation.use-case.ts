import {
  err,
  ok,
  type ClockPort,
  type AuthorizationPort,
  type CompetitionId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { ActorId } from "@futrob/shared-kernel";
import type { RosterMembershipRole } from "../../domain/entities/competition-roster-membership.ts";
import {
  isRosterMembershipRole,
  ROSTER_INVITATION_STATUS,
  type RosterInvitationRedeemPolicy,
  type RosterInvitationStatus,
} from "../../domain/entities/roster-invitation.ts";
import {
  InvalidRosterInvitationRole,
  type CreateRosterInvitationError,
} from "../../domain/errors/roster-invitation.errors.ts";
import { TeamNotFound } from "../../domain/errors/team.errors.ts";
import type { RosterInvitationRepository } from "../../domain/ports/roster-invitation.repository.ts";
import type { RosterInvitationTokenPort } from "../../domain/ports/roster-invitation-token.port.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { TEAM_PERMISSION } from "../../domain/policies/team-permissions.ts";
import { teamPermissionError } from "../require-team-permission.ts";

const DEFAULT_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateRosterInvitationInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly role?: RosterMembershipRole;
  readonly invitedByActorId: ActorId;
  readonly expiresInMs?: number;
  readonly redeemPolicy?: RosterInvitationRedeemPolicy;
}

export interface CreateRosterInvitationResult {
  readonly invitationId: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly role: RosterMembershipRole;
  readonly status: RosterInvitationStatus;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly token: string;
}

export class CreateRosterInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly invitations: RosterInvitationRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly tokens: RosterInvitationTokenPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: CreateRosterInvitationInput,
  ): Promise<Result<CreateRosterInvitationResult, CreateRosterInvitationError>> {
    const forbidden = await teamPermissionError({
      authorization: this.deps.authorization,
      actorId: input.invitedByActorId,
      permission: TEAM_PERMISSION.invitationsManage,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
      },
    });
    if (forbidden) return err(forbidden);
    const role = input.role ?? "player";
    if (!isRosterMembershipRole(role)) {
      return err(
        new InvalidRosterInvitationRole({
          code: "teams.invalid_roster_role",
          message: "Roster invitation role must be player, captain, or vice_captain",
          role,
        }),
      );
    }

    const team = await this.deps.teams.findById(input.organizationId, input.teamId);
    if (!team) {
      return err(
        new TeamNotFound({
          code: "teams.not_found",
          message: "Team not found",
        }),
      );
    }

    const now = this.deps.clock.now();
    const expiresInMs = input.expiresInMs ?? DEFAULT_EXPIRES_IN_MS;
    const expiresAt = new Date(now.getTime() + expiresInMs);
    const invitationId = this.deps.ids.generate();
    const token = this.deps.tokens.generateToken();
    const tokenHash = this.deps.tokens.hashToken(token);

    const redeemPolicy = input.redeemPolicy ?? "single";

    await this.deps.invitations.create({
      id: invitationId,
      organizationId: input.organizationId,
      competitionId: input.competitionId,
      teamId: input.teamId,
      role,
      tokenHash,
      status: ROSTER_INVITATION_STATUS.pending,
      invitedByActorId: input.invitedByActorId,
      expiresAt,
      acceptedByActorId: null,
      createdAt: now,
      redeemPolicy,
    });

    return ok({
      invitationId,
      organizationId: input.organizationId,
      competitionId: input.competitionId,
      teamId: input.teamId,
      role,
      status: ROSTER_INVITATION_STATUS.pending,
      expiresAt,
      createdAt: now,
      token,
    });
  }
}
