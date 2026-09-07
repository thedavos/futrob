export const MS_PER_DAY = 86_400_000;

export const TIME_SORT_DIRECTION = {
  asc: "asc",
  desc: "desc",
} as const;

export type TimeSortDirection = (typeof TIME_SORT_DIRECTION)[keyof typeof TIME_SORT_DIRECTION];

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function daysFromNow(days: number, now: Date = new Date()): Date {
  return addDays(now, days);
}

export function daysFromNowIso(days: number, now: Date = new Date()): string {
  return daysFromNow(days, now).toISOString();
}

/** Whole local calendar days from `from` to `to` (negative if `to` is earlier). */
export function calendarDaysBetween(from: Date, to: Date): number {
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const startOfTo = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((startOfTo - startOfFrom) / MS_PER_DAY);
}

/** Ascending comparator: earlier dates come first. */
export function compareTime(left: Date, right: Date): number {
  return left.getTime() - right.getTime();
}

export function compareByTime<T>(
  select: (item: T) => Date,
  direction: TimeSortDirection = TIME_SORT_DIRECTION.asc,
): (left: T, right: T) => number {
  switch (direction) {
    case TIME_SORT_DIRECTION.asc:
      return (left, right) => compareTime(select(left), select(right));
    case TIME_SORT_DIRECTION.desc:
      return (left, right) => compareTime(select(right), select(left));
    default: {
      const _exhaustive: never = direction;
      return _exhaustive;
    }
  }
}
