import type { OfficialResult } from "@futrob/results";
import { officialSlotKey } from "../domain/entities/team-match-contribution.ts";

export function officialSlotTimes(results: readonly OfficialResult[]): ReadonlyMap<string, Date> {
  const times = new Map<string, Date>();
  for (const result of results) {
    for (const slot of result.slots) {
      if (!Number.isFinite(slot.occurredAt.getTime())) continue;
      times.set(
        officialSlotKey({
          officialResultId: result.id,
          revision: result.revision,
          officialSlot: slot.officialSlot,
          encounterId: result.encounterId,
        }),
        slot.occurredAt,
      );
    }
  }
  return times;
}
