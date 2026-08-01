import {
  domainError,
  err,
  ok,
  type ClockPort,
  type CompetitionId,
  type DomainError,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembership,
  RosterMembershipRole,
} from "../../domain/entities/competition-roster-membership.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";

export interface AddToRosterInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly playerProfileId: string;
  readonly gameAccountId?: string | null;
  readonly role: RosterMembershipRole;
}

export class AddToRosterUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly accounts: PlayerGameAccountRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: AddToRosterInput,
  ): Promise<Result<CompetitionRosterMembership, DomainError>> {
    const team = await this.deps.teams.findById(input.organizationId, input.teamId);
    if (!team) {
      return err(domainError("teams.not_found", "Team not found"));
    }

    const sameTeam = await this.deps.rosters.findByTeamPlayerCompetition(
      input.teamId,
      input.playerProfileId,
      input.competitionId,
    );
    if (sameTeam) return ok(sameTeam);

    const otherTeam = await this.deps.rosters.findByPlayerAndCompetition(
      input.playerProfileId,
      input.competitionId,
    );
    if (otherTeam) {
      return err(
        domainError(
          "teams.roster_competition_conflict",
          "Player already belongs to a team in this competition",
        ),
      );
    }

    let gameAccountId: string | null = input.gameAccountId ?? null;
    if (gameAccountId) {
      const accounts = await this.deps.accounts.listByProfile(input.playerProfileId);
      if (!accounts.some((account) => account.id === gameAccountId)) {
        return err(
          domainError(
            "teams.game_account_not_found",
            "Game account does not belong to this player profile",
          ),
        );
      }
    }

    return ok(
      await this.deps.rosters.add({
        id: this.deps.ids.generate(),
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
        playerProfileId: input.playerProfileId,
        gameAccountId,
        role: input.role,
        createdAt: this.deps.clock.now(),
      }),
    );
  }
}
