import type { CompetitionId, EncounterId } from "@futrob/shared-kernel";
import type { OfficialMatchSelection } from "../entities/official-match-selection.ts";
import type { OfficialResult } from "../entities/official-result.ts";

export interface OfficialMatchSelectionRepository {
  save(selection: OfficialMatchSelection): Promise<OfficialMatchSelection>;
  findLatestByEncounter(encounterId: EncounterId): Promise<OfficialMatchSelection | null>;
}

export interface OfficialResultRepository {
  save(result: OfficialResult): Promise<OfficialResult>;
  findApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResult | null>;
  findLatestByEncounter(encounterId: EncounterId): Promise<OfficialResult | null>;
  findById(officialResultId: string): Promise<OfficialResult | null>;
  listByCompetition(competitionId: CompetitionId): Promise<OfficialResult[]>;
}
