import type {
  OfficialMatchSelectionRepository,
  OfficialResult,
  OfficialResultRepository,
} from "@futrob/results";
import type { EncounterId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { runInPgReadSnapshot } from "@/adapters/persistence/pg-transaction.ts";

/** The approved result and the selection's `updatedAt` as one committed state. */
export type EncounterOfficialState = {
  readonly approvedResult: OfficialResult | null;
  readonly selectionUpdatedAt: Date | null;
};

/**
 * Reads the active approved result and the official selection's `updatedAt` on one database
 * snapshot. A void commits both changes in one transaction (ADR-0016), so separate reads
 * could pair the voided result with the void's timestamp, a state that never existed.
 */
export class EncounterOfficialStateReader {
  constructor(
    private readonly deps: {
      readonly pool: Pool | undefined;
      readonly results: Pick<OfficialResultRepository, "findApprovedByEncounter">;
      readonly selections: Pick<OfficialMatchSelectionRepository, "findLatestByEncounter">;
    },
  ) {}

  readByEncounter(encounterId: EncounterId): Promise<EncounterOfficialState> {
    const read = async (): Promise<EncounterOfficialState> => {
      const approvedResult = await this.deps.results.findApprovedByEncounter(encounterId);
      const selection = await this.deps.selections.findLatestByEncounter(encounterId);
      return { approvedResult, selectionUpdatedAt: selection?.updatedAt ?? null };
    };
    return this.deps.pool ? runInPgReadSnapshot(this.deps.pool, read) : read();
  }
}
