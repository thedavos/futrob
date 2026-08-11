import { err, ok, type ActorId, type ClockPort, type Result } from "@futrob/shared-kernel";
import type { CompetitionRosterMembership } from "../../domain/entities/competition-roster-membership.ts";
import { ROSTER_INVITATION_STATUS } from "../../domain/entities/roster-invitation.ts";
import {
  RosterInvitationExpired,
  RosterInvitationInvalid,
  RosterInvitationNotFound,
  RosterInvitationRevoked,
  type AcceptRosterInvitationError,
} from "../../domain/errors/roster-invitation.errors.ts";
import {
  RosterCompetitionConflict,
  RosterFull,
  RosterLocked,
  TeamNotFound,
} from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { RosterCapacityPort } from "../../domain/ports/roster-capacity.port.ts";
import type { RosterInvitationRepository } from "../../domain/ports/roster-invitation.repository.ts";
import type { RosterInvitationTokenPort } from "../../domain/ports/roster-invitation-token.port.ts";
import type { RosterMutationPort } from "../../domain/ports/roster-mutation.port.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { addToRosterUnchecked } from "../add-to-roster/add-to-roster.use-case.ts";
import type { IdGeneratorPort } from "@futrob/shared-kernel";
import { EnsurePlayerProfileUseCase } from "../ensure-player-profile/ensure-player-profile.use-case.ts";

export interface AcceptRosterInvitationInput {
  readonly token: string;
  readonly actorId: ActorId;
}

type PrecheckResult =
  | { readonly kind: "done"; readonly membership: CompetitionRosterMembership }
  | {
      readonly kind: "continue";
      readonly hasFreeSlot: boolean;
      readonly maxRosterSize: number;
    };

export class AcceptRosterInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly rosterStates: CompetitionRosterStateRepository;
      readonly capacity: RosterCapacityPort;
      readonly profiles: PlayerProfileRepository;
      readonly invitations: RosterInvitationRepository;
      readonly clock: ClockPort;
      readonly tokens: RosterInvitationTokenPort;
      readonly ensurePlayerProfile: EnsurePlayerProfileUseCase;
      readonly accounts: PlayerGameAccountRepository;
      readonly ids: IdGeneratorPort;
      readonly mutations: RosterMutationPort;
    },
  ) {}

  async execute(
    input: AcceptRosterInvitationInput,
  ): Promise<Result<CompetitionRosterMembership, AcceptRosterInvitationError>> {
    const tokenHash = this.deps.tokens.hashToken(input.token);
    const invitation = await this.deps.invitations.findByTokenHash(tokenHash);

    if (!invitation) {
      return err(
        new RosterInvitationNotFound({
          code: "teams.roster_invitation_not_found",
          message: "Roster invitation not found",
        }),
      );
    }

    return this.deps.mutations.runExclusive(
      {
        organizationId: invitation.organizationId,
        competitionId: invitation.competitionId,
        teamId: invitation.teamId,
      },
      () => this.acceptLocked(input, tokenHash),
    );
  }

  private async acceptLocked(
    input: AcceptRosterInvitationInput,
    tokenHash: string,
  ): Promise<Result<CompetitionRosterMembership, AcceptRosterInvitationError>> {
    const invitation = await this.deps.invitations.findByTokenHash(tokenHash);

    if (!invitation) {
      return err(
        new RosterInvitationNotFound({
          code: "teams.roster_invitation_not_found",
          message: "Roster invitation not found",
        }),
      );
    }

    if (invitation.status === ROSTER_INVITATION_STATUS.revoked) {
      return err(
        new RosterInvitationRevoked({
          code: "teams.roster_invitation_revoked",
          message: "Roster invitation has been revoked",
        }),
      );
    }

    const now = this.deps.clock.now();
    if (
      invitation.status === ROSTER_INVITATION_STATUS.expired ||
      invitation.expiresAt.getTime() <= now.getTime()
    ) {
      return err(
        new RosterInvitationExpired({
          code: "teams.roster_invitation_expired",
          message: "Roster invitation has expired",
        }),
      );
    }

    if (
      invitation.redeemPolicy === "single" &&
      invitation.status === ROSTER_INVITATION_STATUS.accepted
    ) {
      return this.acceptedResult(invitation, input.actorId);
    }

    if (invitation.status !== ROSTER_INVITATION_STATUS.pending) {
      return err(
        new RosterInvitationInvalid({
          code: "teams.roster_invitation_invalid",
          message: "Roster invitation is no longer valid",
        }),
      );
    }

    const precheck = await this.precheckAcceptance(invitation, input.actorId);
    if (precheck.kind === "error") {
      return precheck.result;
    }
    if (precheck.kind === "done") {
      return ok(precheck.membership);
    }

    const claimed = await this.deps.invitations.claimPending(tokenHash, input.actorId, now, {
      hasFreeSlot: precheck.hasFreeSlot,
      maxRosterSize: precheck.maxRosterSize,
    });
    if (!claimed) {
      return this.claimFailureResult(tokenHash, input.actorId, now, invitation.redeemPolicy);
    }

    const profile = await this.deps.ensurePlayerProfile.execute({ actorId: input.actorId });
    const added = await addToRosterUnchecked(this.deps, {
      organizationId: claimed.organizationId,
      competitionId: claimed.competitionId,
      teamId: claimed.teamId,
      playerProfileId: profile.id,
      role: claimed.role,
    });

    if (!added.isOk()) {
      throw added.error;
    }

    if (claimed.redeemPolicy === "multi") {
      await this.deps.invitations.deleteRedemption(claimed.id, input.actorId);
    }

    return ok(added.value);
  }

  private async precheckAcceptance(
    invitation: NonNullable<Awaited<ReturnType<RosterInvitationRepository["findByTokenHash"]>>>,
    actorId: ActorId,
  ): Promise<
    | PrecheckResult
    | { readonly kind: "error"; readonly result: Result<never, AcceptRosterInvitationError> }
  > {
    const team = await this.deps.teams.findById(invitation.organizationId, invitation.teamId);
    if (!team) {
      return {
        kind: "error",
        result: err(
          new TeamNotFound({
            code: "teams.not_found",
            message: "Team not found",
          }),
        ),
      };
    }

    const profile = await this.deps.profiles.findByActor(actorId);
    if (profile) {
      const existing = await this.deps.rosters.findByTeamPlayerCompetition(
        invitation.teamId,
        profile.id,
        invitation.competitionId,
      );
      if (existing) {
        return { kind: "done", membership: existing };
      }

      const otherTeam = await this.deps.rosters.findByPlayerAndCompetition(
        profile.id,
        invitation.competitionId,
      );
      if (otherTeam) {
        return {
          kind: "error",
          result: err(
            new RosterCompetitionConflict({
              code: "teams.roster_competition_conflict",
              message: "Player already belongs to a team in this competition",
            }),
          ),
        };
      }
    }

    const rosterState = await this.deps.rosterStates.get(
      invitation.organizationId,
      invitation.competitionId,
      invitation.teamId,
    );
    if (rosterState?.lockedAt) {
      return {
        kind: "error",
        result: err(
          new RosterLocked({
            code: "teams.roster_locked",
            message: "Roster is locked for this competition",
          }),
        ),
      };
    }

    const maxRosterSize = await this.deps.capacity.getMaxRosterSize(invitation.competitionId);
    const currentMembers = await this.deps.rosters.listByTeam(
      invitation.organizationId,
      invitation.competitionId,
      invitation.teamId,
    );
    const hasFreeSlot = currentMembers.length < maxRosterSize;

    if (invitation.redeemPolicy === "multi") {
      const priorRedemption = await this.deps.invitations.findRedemption(invitation.id, actorId);
      if (!hasFreeSlot && !priorRedemption) {
        return {
          kind: "error",
          result: err(
            new RosterFull({
              code: "teams.roster_full",
              message: "Roster has reached maximum capacity",
            }),
          ),
        };
      }
    } else if (!hasFreeSlot) {
      return {
        kind: "error",
        result: err(
          new RosterFull({
            code: "teams.roster_full",
            message: "Roster has reached maximum capacity",
          }),
        ),
      };
    }

    return { kind: "continue", hasFreeSlot, maxRosterSize };
  }

  private async claimFailureResult(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    redeemPolicy: NonNullable<
      Awaited<ReturnType<RosterInvitationRepository["findByTokenHash"]>>
    >["redeemPolicy"],
  ): Promise<Result<CompetitionRosterMembership, AcceptRosterInvitationError>> {
    const current = await this.deps.invitations.findByTokenHash(tokenHash);
    if (!current) {
      return err(
        new RosterInvitationNotFound({
          code: "teams.roster_invitation_not_found",
          message: "Roster invitation not found",
        }),
      );
    }
    if (current.status === ROSTER_INVITATION_STATUS.revoked) {
      return err(
        new RosterInvitationRevoked({
          code: "teams.roster_invitation_revoked",
          message: "Roster invitation has been revoked",
        }),
      );
    }
    if (
      current.status === ROSTER_INVITATION_STATUS.expired ||
      current.expiresAt.getTime() <= now.getTime()
    ) {
      return err(
        new RosterInvitationExpired({
          code: "teams.roster_invitation_expired",
          message: "Roster invitation has expired",
        }),
      );
    }
    if (redeemPolicy === "single" && current.status === ROSTER_INVITATION_STATUS.accepted) {
      return this.acceptedResult(current, actorId);
    }
    if (redeemPolicy === "multi" && current.status === ROSTER_INVITATION_STATUS.pending) {
      const priorRedemption = await this.deps.invitations.findRedemption(current.id, actorId);
      if (priorRedemption) {
        const profile = await this.deps.ensurePlayerProfile.execute({ actorId });
        const existing = await this.deps.rosters.findByTeamPlayerCompetition(
          current.teamId,
          profile.id,
          current.competitionId,
        );
        if (existing) {
          return ok(existing);
        }
      }
      return err(
        new RosterFull({
          code: "teams.roster_full",
          message: "Roster has reached maximum capacity",
        }),
      );
    }
    return err(
      new RosterInvitationInvalid({
        code: "teams.roster_invitation_invalid",
        message: "Roster invitation is no longer valid",
      }),
    );
  }

  private async acceptedResult(
    invitation: NonNullable<Awaited<ReturnType<RosterInvitationRepository["findByTokenHash"]>>>,
    actorId: ActorId,
  ): Promise<Result<CompetitionRosterMembership, AcceptRosterInvitationError>> {
    if (invitation.acceptedByActorId === actorId) {
      const profile = await this.deps.ensurePlayerProfile.execute({ actorId });
      const existing = await this.deps.rosters.findByTeamPlayerCompetition(
        invitation.teamId,
        profile.id,
        invitation.competitionId,
      );
      if (existing) {
        return ok(existing);
      }
      const added = await addToRosterUnchecked(this.deps, {
        organizationId: invitation.organizationId,
        competitionId: invitation.competitionId,
        teamId: invitation.teamId,
        playerProfileId: profile.id,
        role: invitation.role,
      });
      if (!added.isOk()) {
        throw added.error;
      }
      return ok(added.value);
    }
    return err(
      new RosterInvitationInvalid({
        code: "teams.roster_invitation_invalid",
        message: "Roster invitation is no longer valid",
      }),
    );
  }
}
