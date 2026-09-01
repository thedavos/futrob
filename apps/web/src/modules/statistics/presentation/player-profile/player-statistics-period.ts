import { z } from "zod";
import { getMyGameProfileQuerySchema, type GetMyGameProfileQuery } from "@futrob/api-contracts";
import { calendarDayKey, startOfLocalDay } from "../player-match-view-calendar.ts";

export const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface PlayerStatisticsCalendarRange {
  readonly from: string;
  readonly to: string;
}

export const playerStatisticsSearchSchema = z.object({
  from: z.string().regex(CALENDAR_DATE_PATTERN).optional(),
  to: z.string().regex(CALENDAR_DATE_PATTERN).optional(),
});

export type PlayerStatisticsSearch = z.infer<typeof playerStatisticsSearchSchema>;

export function parseCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function defaultPlayerStatisticsWeek(now: Date): PlayerStatisticsCalendarRange {
  const end = startOfLocalDay(now);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { from: calendarDayKey(start), to: calendarDayKey(end) };
}

export function calendarRangeToInstantPeriod(
  range: PlayerStatisticsCalendarRange,
): { readonly from: Date; readonly to: Date } | null {
  const from = parseCalendarDate(range.from);
  const to = parseCalendarDate(range.to);
  if (!from || !to || from.getTime() > to.getTime()) return null;
  const exclusiveTo = new Date(to);
  exclusiveTo.setDate(exclusiveTo.getDate() + 1);
  return { from, to: exclusiveTo };
}

export function normalizePlayerStatisticsSearch(
  search: PlayerStatisticsSearch,
  now = new Date(),
): PlayerStatisticsCalendarRange {
  const fallback = defaultPlayerStatisticsWeek(now);
  if (search.from === undefined || search.to === undefined) return fallback;
  const range = { from: search.from, to: search.to };
  return calendarRangeToInstantPeriod(range) ? range : fallback;
}

export function gameProfileQueryFromRange(input: {
  readonly externalClubId?: string;
  readonly range: PlayerStatisticsCalendarRange;
}): GetMyGameProfileQuery {
  const period = calendarRangeToInstantPeriod(input.range);
  if (!period) {
    throw new Error("player statistics range must be a valid calendar period");
  }
  const query = {
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  };
  if (input.externalClubId === undefined) {
    return getMyGameProfileQuerySchema.parse(query);
  }
  return getMyGameProfileQuerySchema.parse({
    ...query,
    externalClubId: input.externalClubId,
  });
}
