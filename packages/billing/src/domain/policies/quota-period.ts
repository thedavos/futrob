export interface QuotaPeriod {
  /** `YYYY-MM` of the UTC calendar month. */
  readonly key: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export function calendarMonthUtc(now: Date): QuotaPeriod {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    startsAt: new Date(Date.UTC(year, month, 1)),
    endsAt: new Date(Date.UTC(year, month + 1, 1)),
  };
}
