import type { CompetitionId } from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";

export interface ListMyMatchContributionsInput {
  readonly playerProfileId: string;
  readonly competitionId?: CompetitionId;
  readonly cursor?: string;
  readonly limit: number;
}

export interface ListMyMatchContributionsOutput {
  readonly items: PlayerMatchContribution[];
  readonly nextCursor: string | null;
}

export class ListMyMatchContributionsUseCase {
  constructor(private readonly contributions: PlayerMatchContributionRepository) {}

  async execute(input: ListMyMatchContributionsInput): Promise<ListMyMatchContributionsOutput> {
    return this.contributions.listMatchedPage(input);
  }
}
