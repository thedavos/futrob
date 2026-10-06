import type { EncounterId } from "@futrob/shared-kernel";
import type { OfficialMatch } from "../entities/official-match.ts";

export interface OfficialMatchRepository {
  listByEncounter(encounterId: EncounterId): Promise<OfficialMatch[]>;
  /** Inserts missing slots; an existing slot keeps its row, status and start. */
  upsertMany(matches: readonly OfficialMatch[]): Promise<void>;
  /** Inserts missing slots and sets the start of existing ones; status is never changed. */
  saveSchedules(matches: readonly OfficialMatch[]): Promise<void>;
  voidByEncounterIds(encounterIds: readonly EncounterId[]): Promise<void>;
}
