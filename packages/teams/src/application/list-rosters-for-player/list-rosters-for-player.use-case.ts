import type { CompetitionRosterMembership } from "../../domain/entities/competition-roster-membership.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";

export class ListRostersForPlayerUseCase {
  constructor(private readonly rosters: CompetitionRosterMembershipRepository) {}

  async execute(input: {
    readonly playerProfileId: string;
  }): Promise<readonly CompetitionRosterMembership[]> {
    return this.rosters.listByPlayerProfile(input.playerProfileId);
  }
}
