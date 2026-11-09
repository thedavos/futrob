/**
 * Calendar dates for the fixture, always read in the competition's time zone.
 *
 * A `DateKey` (`YYYY-MM-DD`) names a wall-calendar day there and a `MonthKey` (`YYYY-MM`)
 * a month. Keys sort as strings, so comparisons never touch the viewer's local zone.
 */
export type DateKey = string;
export type MonthKey = string;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = partsFormatters.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  partsFormatters.set(timeZone, formatter);
  return formatter;
}

/** The calendar day an instant falls on in `timeZone`. */
export function zonedDateKey(instant: string, timeZone: string): DateKey {
  const parts = partsFormatter(timeZone).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function monthOf(date: DateKey): MonthKey {
  return date.slice(0, 7);
}

/** Noon UTC of the day: a stable instant to format a date-only key with `timeZone: "UTC"`. */
export function dateKeyInstant(date: DateKey): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
}

export function monthKeyInstant(month: MonthKey): Date {
  return dateKeyInstant(`${month}-01`);
}

function toDateKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [year, index] = month.split("-").map(Number);
  return toDateKey(new Date(Date.UTC(year ?? 1970, (index ?? 1) - 1 + delta, 1))).slice(0, 7);
}

/**
 * The weeks shown for a month, Monday first. Days outside the month are null so the
 * grid keeps its shape without inventing navigation to them.
 */
export function monthWeeks(month: MonthKey): readonly (readonly (DateKey | null)[])[] {
  const first = monthKeyInstant(month);
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const weeks: (DateKey | null)[][] = [];
  for (let index = 0; index < cells; index += 1) {
    const day = index - leading + 1;
    const key = day >= 1 && day <= daysInMonth ? `${month}-${String(day).padStart(2, "0")}` : null;
    if (index % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]?.push(key);
  }
  return weeks;
}

/** Monday-first weekday names, for the month grid header. */
export function weekdayNames(locale: string, width: "short" | "narrow"): readonly string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, offset) =>
    format.format(dateKeyInstant(`2024-01-${String(offset + 1).padStart(2, "0")}`)),
  );
}

export function formatDateKey(
  date: DateKey,
  locale: string,
  options: Omit<Intl.DateTimeFormatOptions, "timeZone">,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    dateKeyInstant(date),
  );
}

export function formatMonthKey(month: MonthKey, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthKeyInstant(month));
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

export function dayOfMonth(date: DateKey): number {
  return Number(date.slice(8, 10));
}
