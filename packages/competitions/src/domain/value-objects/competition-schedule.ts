declare const calendarDateBrand: unique symbol;

/** `YYYY-MM-DD` naming a real day, read in the competition time zone. */
export type CalendarDate = string & { readonly [calendarDateBrand]: true };

export interface CompetitionSchedule {
  readonly startsOn: CalendarDate | null;
  readonly endsOn: CalendarDate | null;
}

export const EMPTY_SCHEDULE: CompetitionSchedule = { startsOn: null, endsOn: null };

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarDate(value: string): CalendarDate | null {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  // SAFETY: `value` matched YYYY-MM-DD and round-tripped through Date.UTC as a real day.
  return real ? (value as CalendarDate) : null;
}

/** Both dates optional; when both exist the end cannot precede the start. */
export function parseSchedule(input: {
  readonly startsOn: string | null;
  readonly endsOn: string | null;
}): CompetitionSchedule | null {
  const startsOn = input.startsOn === null ? null : parseCalendarDate(input.startsOn);
  const endsOn = input.endsOn === null ? null : parseCalendarDate(input.endsOn);
  if (input.startsOn !== null && startsOn === null) return null;
  if (input.endsOn !== null && endsOn === null) return null;
  if (startsOn !== null && endsOn !== null && endsOn < startsOn) return null;
  return { startsOn, endsOn };
}
