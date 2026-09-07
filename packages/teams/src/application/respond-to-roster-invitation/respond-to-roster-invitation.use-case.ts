import {
  assertNever,
  err,
  ok,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
  type Result,
} from "@futrob/shared-kernel";
import type { CompetitionRosterMembership } from "../../domain/entities/competition-roster-membership.ts";
import {
  ROSTER_INVITATION_STATUS,
  type RosterInvitation,
} from "../../domain/entities/roster-invitation.ts";
import {
  RosterInvitationExpired,
  RosterInvitationForbidden,
  RosterInvitationInvalid,
  RosterInvitationNotFound,
  RosterInvitationRevoked,
  type RespondToRosterInvitationError,
} from "../../domain/errors/roster-invitation.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { RosterCapacityPort } from "../../domain/ports/roster-capacity.port.ts";
import type { RosterEntryGatePort } from "../../domain/ports/roster-entry-gate.port.ts";
import type { RosterInvitationRepository } from "../../domain/ports/roster-invitation.repository.ts";
import type { RosterMutationPort } from "../../domain/ports/roster-mutation.port.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { addToRosterUnchecked } from "../add-to-roster/add-to-roster.use-case.ts";
import type { EnsurePlayerProfileUseCase } from "../ensure-player-profile/ensure-player-profile.use-case.ts";

export type RosterInvitationResponseAction = "accept" | "decline";

export interface RespondToRosterInvitationInput {
  readonly invitationId: string;
  readonly actorId: ActorId;
  readonly action: RosterInvitationResponseAction;
}

export type RespondToRosterInvitationOutcome =
  | { readonly kind: "accepted"; readonly membership: CompetitionRosterMembership }
  | { readonly kind: "declined" };

type RespondResult = Result<RespondToRosterInvitationOutcome, RespondToRosterInvitationError>;

export class RespondToRosterInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly rosterStates: CompetitionRosterStateRepository;
      readonly capacity: RosterCapacityPort;
      readonly entryGate: RosterEntryGatePort;
      readonly invitations: RosterInvitationRepository;
      readonly accounts: PlayerGameAccountRepository;
      readonly ensurePlayerProfile: EnsurePlayerProfileUseCase;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly mutations: RosterMutationPort;
    },
  ) {}

  async execute(input: RespondToRosterInvitationInput): Promise<RespondResult> {
    const invitation = await this.deps.invitations.findById(input.invitationId);
    if (!invitation) return err(notFound());
    const forbidden = this.forbiddenError(invitation, input.actorId);
    if (forbidden) return err(forbidden);

    return this.deps.mutations.runExclusive(
      {
        organizationId: invitation.organizationId,
        competitionId: invitation.competitionId,
        teamId: invitation.teamId,
      },
      () => this.respondLocked(input),
    );
  }

  private async respondLocked(input: RespondToRosterInvitationInput): Promise<RespondResult> {
    const invitation = await this.deps.invitations.findById(input.invitationId);
    if (!invitation) return err(notFound());
    const forbidden = this.forbiddenError(invitation, input.actorId);
    if (forbidden) return err(forbidden);

    const now = this.deps.clock.now();
    switch (invitation.status) {
      case ROSTER_INVITATION_STATUS.revoked:
        return err(
          new RosterInvitationRevoked({
            code: "teams.roster_invitation_revoked",
            message: "Roster invitation has been revoked",
          }),
        );
      case ROSTER_INVITATION_STATUS.expired:
        return err(expired());
      case ROSTER_INVITATION_STATUS.declined:
        return input.action === "decline" ? ok({ kind: "declined" }) : err(invalid());
      case ROSTER_INVITATION_STATUS.accepted:
        if (input.action === "accept" && invitation.acceptedByActorId === input.actorId) {
          return this.ensureAcceptedMembership(invitation, input.actorId);
        }
        return err(invalid());
      case ROSTER_INVITATION_STATUS.pending: {
        if (invitation.expiresAt.getTime() <= now.getTime()) return err(expired());
        if (input.action === "decline") {
          const declined = await this.deps.invitations.declinePending(
            invitation.id,
            input.actorId,
            now,
          );
          return declined ? ok({ kind: "declined" }) : err(invalid());
        }
        return this.acceptPending(invitation, input.actorId, now);
      }
      default:
        return assertNever(invitation.status, "Unhandled roster invitation status");
    }
  }

  private async acceptPending(
    invitation: RosterInvitation,
    actorId: ActorId,
    now: Date,
  ): Promise<RespondResult> {
    const profile = await this.deps.ensurePlayerProfile.execute({ actorId });
    const added = await addToRosterUnchecked(this.deps, {
      organizationId: invitation.organizationId,
      competitionId: invitation.competitionId,
      teamId: invitation.teamId,
      playerProfileId: profile.id,
      role: invitation.role,
    });
    if (!added.isOk()) return err(added.error);

    await this.deps.invitations.acceptPendingById(invitation.id, actorId, now);
    return ok({ kind: "accepted", membership: added.value });
  }

  private async ensureAcceptedMembership(
    invitation: RosterInvitation,
    actorId: ActorId,
  ): Promise<RespondResult> {
    const profile = await this.deps.ensurePlayerProfile.execute({ actorId });
    const existing = await this.deps.rosters.findByTeamPlayerCompetition(
      invitation.teamId,
      profile.id,
      invitation.competitionId,
    );
    if (existing) return ok({ kind: "accepted", membership: existing });
    const added = await addToRosterUnchecked(this.deps, {
      organizationId: invitation.organizationId,
      competitionId: invitation.competitionId,
      teamId: invitation.teamId,
      playerProfileId: profile.id,
      role: invitation.role,
    });
    if (!added.isOk()) return err(added.error);
    return ok({ kind: "accepted", membership: added.value });
  }

  private forbiddenError(
    invitation: RosterInvitation,
    actorId: ActorId,
  ): RosterInvitationForbidden | null {
    if (invitation.inviteeActorId && invitation.inviteeActorId === actorId) return null;
    return new RosterInvitationForbidden({
      code: "teams.roster_invitation_forbidden",
      message: "Only the invited player can respond to this invitation",
    });
  }
}

function notFound(): RosterInvitationNotFound {
  return new RosterInvitationNotFound({
    code: "teams.roster_invitation_not_found",
    message: "Roster invitation not found",
  });
}

function invalid(): RosterInvitationInvalid {
  return new RosterInvitationInvalid({
    code: "teams.roster_invitation_invalid",
    message: "Roster invitation is no longer valid",
  });
}

function expired(): RosterInvitationExpired {
  return new RosterInvitationExpired({
    code: "teams.roster_invitation_expired",
    message: "Roster invitation has expired",
  });
}
