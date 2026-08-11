import type { CompetitionId, EncounterId } from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../entities/player-match-contribution.ts";

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
  listByPlayerProfile(playerProfileId: string): Promise<PlayerMatchContribution[]>;
  listByOfficialResult(officialResultId: string): Promise<PlayerMatchContribution[]>;
  listByEncounter(encounterId: EncounterId): Promise<PlayerMatchContribution[]>;
  listMatchedPage(input: {
    readonly playerProfileId: string;
    readonly competitionId?: CompetitionId;
    readonly cursor?: string;
    readonly limit: number;
  }): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }>;
}
