import type { EncounterId } from "@futrob/shared-kernel";
import type { OfficialMatch } from "../entities/official-match.ts";

export interface OfficialMatchRepository {
  listByEncounter(encounterId: EncounterId): Promise<OfficialMatch[]>;
  upsertMany(matches: readonly OfficialMatch[]): Promise<void>;
}
