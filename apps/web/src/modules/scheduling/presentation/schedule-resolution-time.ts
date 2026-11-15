import type { CreateScheduleChangeRequestBody } from "@futrob/api-contracts";
import { interpretCompetitionWallTime } from "@futrob/scheduling";

export type CompetitionWallTime = CreateScheduleChangeRequestBody["proposedWallTime"];

/** Reads a `datetime-local` value as written, never through the browser's time zone. */
export function competitionWallTime(value: string): CompetitionWallTime | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: 0,
  };
}

export function resolutionInstant(value: string, timeZone: string): string | null {
  const wallTime = competitionWallTime(value);
  if (!wallTime) return null;
  const interpreted = interpretCompetitionWallTime({ wallTime, timeZone });
  return interpreted.isOk() ? interpreted.value.toISOString() : null;
}

export function resolutionLocalTime(instant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
