import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";

export type CalendarDayKind = "today" | "yesterday" | "other";

export type MatchDayGroup = {
  readonly dayKey: string;
  readonly occurredAt: Date;
  readonly matches: readonly PlayerRecentProviderMatchDto[];
};

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calendarDayKey(occurredAt: Date): string {
  const day = startOfLocalDay(occurredAt);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

export function calendarDayKind(occurredAt: Date, now: Date): CalendarDayKind {
  const day = startOfLocalDay(occurredAt).getTime();
  const today = startOfLocalDay(now).getTime();
  if (day === today) return "today";
  const yesterday = startOfLocalDay(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return "yesterday";
  return "other";
}

export function groupMatchesByDay(
  matches: readonly PlayerRecentProviderMatchDto[],
): readonly MatchDayGroup[] {
  const groups = new Map<string, PlayerRecentProviderMatchDto[]>();
  const order: string[] = [];

  for (const item of matches) {
    const occurredAt = new Date(item.match.occurredAt);
    const dayKey = calendarDayKey(occurredAt);
    const existing = groups.get(dayKey);
    if (existing === undefined) {
      groups.set(dayKey, [item]);
      order.push(dayKey);
      continue;
    }
    existing.push(item);
  }

  return order.map((dayKey) => {
    const dayMatches = groups.get(dayKey) ?? [];
    return {
      dayKey,
      occurredAt: new Date(dayMatches[0]?.match.occurredAt ?? 0),
      matches: dayMatches,
    };
  });
}
