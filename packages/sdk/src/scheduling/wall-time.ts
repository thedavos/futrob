import type { CreateScheduleChangeRequestBody } from "@futrob/api-contracts";

/** A wall clock in the competition's zone; commands send it as `proposedWallTime`. */
export type CompetitionWallTime = CreateScheduleChangeRequestBody["proposedWallTime"];

/** The date and time fields a client edits, as `YYYY-MM-DD` and `HH:MM`. */
export interface WallTimeFields {
  readonly date: string;
  readonly time: string;
}

/**
 * Reads the fields as written, never through the device's time zone. `null` when either field
 * is not a real calendar date or 24-hour time.
 */
export function parseCompetitionWallTime(fields: WallTimeFields): CompetitionWallTime | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fields.date.trim());
  const time = /^(\d{1,2}):(\d{2})$/.exec(fields.time.trim());
  if (!date || !time) return null;
  const wallTime = {
    year: Number(date[1]),
    month: Number(date[2]),
    day: Number(date[3]),
    hour: Number(time[1]),
    minute: Number(time[2]),
    second: 0,
  };
  const calendar = new Date(Date.UTC(wallTime.year, wallTime.month - 1, wallTime.day));
  const realDate =
    calendar.getUTCFullYear() === wallTime.year &&
    calendar.getUTCMonth() === wallTime.month - 1 &&
    calendar.getUTCDate() === wallTime.day;
  if (!realDate || wallTime.hour > 23 || wallTime.minute > 59) return null;
  return wallTime;
}

/**
 * The UTC instant the server will store for this wall time, as an ISO string. `null` for an
 * unknown zone or a local time that does not exist there (a daylight-saving gap). The API checks
 * it again; this only lets the client preview the instant and reject it before sending.
 */
export function competitionWallTimeInstant(
  wallTime: CompetitionWallTime,
  timeZone: string,
): string | null {
  if (!isTimeZone(timeZone)) return null;
  const desired = partsAsUtc(wallTime);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const difference = desired - partsAsUtc(zonedParts(new Date(candidate), timeZone));
    if (difference === 0) break;
    candidate += difference;
  }
  const observed = zonedParts(new Date(candidate), timeZone);
  return partsAsUtc(observed) === desired ? new Date(candidate).toISOString() : null;
}

/** The fields that show `instant` on the competition's wall clock. */
export function competitionWallTimeFields(instant: string, timeZone: string): WallTimeFields {
  const parts = zonedParts(new Date(instant), timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
  };
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, timeZone: string): CompetitionWallTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function partsAsUtc(parts: CompetitionWallTime): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}
