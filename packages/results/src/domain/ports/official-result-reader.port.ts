import type { CompetitionId, EncounterId } from "@futrob/shared-kernel";
import type { OfficialResult } from "../entities/official-result.ts";

/**
 * Cross-BC read model for official results, including voided rows.
 * Statistics projection looks up by id or latest revision of any status.
 */
export interface OfficialResultReaderPort {
  getApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResult | null>;
  getLatestByEncounter(encounterId: EncounterId): Promise<OfficialResult | null>;
  getById(officialResultId: string): Promise<OfficialResult | null>;
  listByCompetition(competitionId: CompetitionId): Promise<OfficialResult[]>;
}
