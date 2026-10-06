import type { EncounterScheduleSnapshot } from "../entities/encounter-schedule-snapshot.ts";
import type { OfficialMatch } from "../entities/official-match.ts";
import type { RescheduleScope } from "../value-objects/reschedule-scope.ts";

export interface OfficialMatchSchedule {
  readonly slot: 1 | 2;
  readonly scheduledStartAt: Date;
}

export interface OfficialMatchScheduleChange {
  readonly slot: 1 | 2;
  readonly previousStartAt: Date;
  readonly appliedStartAt: Date;
}

/**
 * Start of every slot the Encounter plays. A slot without a stored row starts with the
 * Encounter, the same rule the 0052 backfill applied to existing slots.
 */
export function officialMatchSchedules(
  encounter: Pick<EncounterScheduleSnapshot, "scheduledStartAt" | "officialMatchCount">,
  matches: readonly Pick<OfficialMatch, "slot" | "scheduledStartAt">[],
): readonly OfficialMatchSchedule[] {
  const slots: readonly (1 | 2)[] = encounter.officialMatchCount === 1 ? [1] : [1, 2];
  return slots.map((slot) => ({
    slot,
    scheduledStartAt: new Date(
      (
        matches.find((match) => match.slot === slot)?.scheduledStartAt ?? encounter.scheduledStartAt
      ).getTime(),
    ),
  }));
}

/** The Encounter starts with its earliest slot. */
export function encounterStartOf(schedules: readonly OfficialMatchSchedule[]): Date | null {
  const times = schedules.map((schedule) => schedule.scheduledStartAt.getTime());
  return times.length === 0 ? null : new Date(Math.min(...times));
}

/** What a proposal for `scope` replaces: the Encounter start or the start of one slot. */
export function currentStartFor(
  scope: RescheduleScope,
  schedules: readonly OfficialMatchSchedule[],
): Date | null {
  switch (scope.type) {
    case "entire_encounter":
      return encounterStartOf(schedules);
    case "official_match": {
      const slot = schedules.find((schedule) => schedule.slot === scope.officialSlot);
      return slot ? new Date(slot.scheduledStartAt.getTime()) : null;
    }
    default: {
      const exhaustiveScope: never = scope;
      void exhaustiveScope;
      return null;
    }
  }
}

/**
 * `entire_encounter`: `startAt` is the new Encounter start and every slot moves by the
 * same delta, keeping their spacing. `official_match`: only that slot moves. Returns every
 * slot with its start before and after, or null when the scope names a missing slot.
 */
export function rescheduleOfficialMatches(
  scope: RescheduleScope,
  startAt: Date,
  schedules: readonly OfficialMatchSchedule[],
): readonly OfficialMatchScheduleChange[] | null {
  const current = currentStartFor(scope, schedules);
  if (!current) return null;
  const delta = startAt.getTime() - current.getTime();
  return schedules.map((schedule) => {
    const moves = scope.type === "entire_encounter" || scope.officialSlot === schedule.slot;
    return {
      slot: schedule.slot,
      previousStartAt: new Date(schedule.scheduledStartAt.getTime()),
      appliedStartAt: new Date(schedule.scheduledStartAt.getTime() + (moves ? delta : 0)),
    };
  });
}
