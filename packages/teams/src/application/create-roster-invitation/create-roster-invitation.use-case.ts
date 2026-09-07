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
  type ActorId,
} from "@futrob/shared-kernel";
import type { RosterMembershipRole } from "../../domain/entities/competition-roster-membership.ts";
import { normalizeGameAccountIdentifier } from "../../domain/entities/player-game-account.ts";
import {
  isRosterMembershipRole,
  ROSTER_INVITATION_STATUS,
  type RosterInvitationRedeemPolicy,
  type RosterInvitationStatus,
} from "../../domain/entities/roster-invitation.ts";
import {
  InvalidRosterInvitationRole,
  RosterInviteeNotFound,
  type CreateRosterInvitationError,
} from "../../domain/errors/roster-invitation.errors.ts";
import { TeamNotFound, RosterEntryInactive } from "../../domain/errors/team.errors.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";
import type { RosterEntryGatePort } from "../../domain/ports/roster-entry-gate.port.ts";
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
  readonly invitedByDisplayName?: string | null;
  readonly inviteeIdentifier?: string | null;
  readonly message?: string | null;
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
  readonly inviteeIdentifier: string | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly token: string;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export class CreateRosterInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly invitations: RosterInvitationRepository;
      readonly profiles: PlayerProfileRepository;
      readonly accounts: PlayerGameAccountRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly tokens: RosterInvitationTokenPort;
      readonly authorization: AuthorizationPort;
      readonly entryGate: RosterEntryGatePort;
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
    const canMutate = await this.deps.entryGate.canMutateRoster(
      input.organizationId,
      input.competitionId,
      input.teamId,
    );
    if (!canMutate) {
      return err(
        new RosterEntryInactive({
          code: "teams.roster_entry_inactive",
          message: "Roster writes are closed for this competition entry",
        }),
      );
    }

    const inviteeIdentifier = normalizeOptionalText(input.inviteeIdentifier);
    let inviteeActorId: ActorId | null = null;
    if (inviteeIdentifier) {
      inviteeActorId = await this.resolveInviteeActorId(inviteeIdentifier);
      if (!inviteeActorId) {
        return err(
          new RosterInviteeNotFound({
            code: "teams.invitee_not_found",
            message: "No player is registered with that game identifier",
            identifier: inviteeIdentifier,
          }),
        );
      }
    }
    const invitedByGamertag = await this.resolveInviterGamertag(input.invitedByActorId);

    const now = this.deps.clock.now();
    const expiresInMs = input.expiresInMs ?? DEFAULT_EXPIRES_IN_MS;
    const expiresAt = new Date(now.getTime() + expiresInMs);
    const invitationId = this.deps.ids.generate();
    const token = this.deps.tokens.generateToken();
    const tokenHash = this.deps.tokens.hashToken(token);

    // A directed invitation targets one recipient; multi redemption never applies.
    const redeemPolicy = inviteeActorId ? "single" : (input.redeemPolicy ?? "single");

    await this.deps.invitations.create({
      id: invitationId,
      organizationId: input.organizationId,
      competitionId: input.competitionId,
      teamId: input.teamId,
      role,
      tokenHash,
      status: ROSTER_INVITATION_STATUS.pending,
      invitedByActorId: input.invitedByActorId,
      invitedByDisplayName: normalizeOptionalText(input.invitedByDisplayName),
      invitedByGamertag,
      inviteeActorId,
      inviteeIdentifier,
      message: normalizeOptionalText(input.message),
      expiresAt,
      acceptedByActorId: null,
      respondedAt: null,
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
      inviteeIdentifier,
      expiresAt,
      createdAt: now,
      token,
    });
  }

  private async resolveInviteeActorId(identifier: string): Promise<ActorId | null> {
    const normalized = normalizeGameAccountIdentifier(identifier);
    const accounts = await this.deps.accounts.findByNormalizedIdentifier(normalized);
    for (const account of accounts) {
      const profile = await this.deps.profiles.findById(account.playerProfileId);
      if (profile) return profile.actorId;
    }
    return null;
  }

  private async resolveInviterGamertag(invitedByActorId: ActorId): Promise<string | null> {
    const profile = await this.deps.profiles.findByActor(invitedByActorId);
    if (!profile) return null;
    const accounts = await this.deps.accounts.listByProfile(profile.id);
    return accounts[0]?.identifier ?? null;
  }
}
