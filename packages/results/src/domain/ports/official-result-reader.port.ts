import type { CompetitionId, EncounterId } from "@futrob/shared-kernel";
import type { OfficialResult } from "../entities/official-result.ts";

/**
 * Cross-BC read model for approved official results.
 * Consumers (statistics) depend on this port; adapters live in apps.
 */
export interface OfficialResultReaderPort {
  getApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResult | null>;
  getById(officialResultId: string): Promise<OfficialResult | null>;
  listByCompetition(competitionId: CompetitionId): Promise<OfficialResult[]>;
}
