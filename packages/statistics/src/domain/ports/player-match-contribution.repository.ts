import type { CompetitionId, EncounterId, TeamId } from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../entities/player-match-contribution.ts";

export interface MatchedPlayerContributionQuery {
  readonly playerProfileId: string;
  readonly competitionId?: CompetitionId;
  readonly teamId?: TeamId;
  readonly gameEdition?: string;
  readonly platform?: string;
  readonly position?: string;
}

export interface MatchedPlayerContributionPageQuery extends MatchedPlayerContributionQuery {
  readonly cursor?: string;
  readonly limit: number;
}

export interface PlayerMatchContributionRepository {
  saveMany(contributions: readonly PlayerMatchContribution[]): Promise<void>;
  deleteByOfficialResultRevision(input: {
    readonly officialResultId: string;
    readonly revision: number | "all";
  }): Promise<void>;
  deleteByEncounterRevision(input: {
    readonly encounterId: EncounterId;
    readonly revision: number | "all";
  }): Promise<void>;
  deleteByCompetition(competitionId: CompetitionId): Promise<void>;
  listByPlayerProfile(playerProfileId: string): Promise<PlayerMatchContribution[]>;
  listByOfficialResult(officialResultId: string): Promise<PlayerMatchContribution[]>;
  listByEncounter(encounterId: EncounterId): Promise<PlayerMatchContribution[]>;
  listByCompetition(competitionId: CompetitionId): Promise<PlayerMatchContribution[]>;
  listMatched(input: MatchedPlayerContributionQuery): Promise<PlayerMatchContribution[]>;
  listMatchedPage(input: MatchedPlayerContributionPageQuery): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }>;
}
