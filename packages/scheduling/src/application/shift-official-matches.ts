import type { EncounterId } from "@futrob/shared-kernel";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import {
  officialMatchSchedules,
  rescheduleOfficialMatches,
} from "../domain/policies/official-match-schedule.ts";

/**
 * A direct change of the Encounter start moves its stored slots like an
 * `entire_encounter` reschedule: same delta, spacing kept.
 */
export async function shiftOfficialMatches(
  matches: Pick<OfficialMatchRepository, "listByEncounter" | "saveSchedules">,
  encounterId: EncounterId,
  current: Pick<EncounterScheduleSnapshot, "scheduledStartAt" | "officialMatchCount">,
  startAt: Date,
): Promise<void> {
  const stored = await matches.listByEncounter(encounterId);
  const changes = rescheduleOfficialMatches(
    { type: "entire_encounter" },
    startAt,
    officialMatchSchedules(current, stored),
  );
  const moved = stored.flatMap((row) => {
    const change = changes?.find((entry) => entry.slot === row.slot);
    return change ? [{ ...row, scheduledStartAt: change.appliedStartAt }] : [];
  });
  if (moved.length > 0) await matches.saveSchedules(moved);
}
