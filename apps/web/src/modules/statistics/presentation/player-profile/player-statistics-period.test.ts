import { describe, expect, it } from "vite-plus/test";
import {
  calendarRangeToInstantPeriod,
  defaultPlayerStatisticsWeek,
  gameProfileQueryFromRange,
  normalizePlayerStatisticsSearch,
  parseCalendarDate,
} from "./player-statistics-period.ts";

const now = new Date(2026, 7, 31, 18, 30, 0);

describe("player statistics period", () => {
  it("defaults to today and the six previous local calendar days", () => {
    expect(defaultPlayerStatisticsWeek(now)).toEqual({ from: "2026-08-25", to: "2026-08-31" });
  });

  it("converts the last calendar day into an exclusive next-day bound", () => {
    expect(calendarRangeToInstantPeriod({ from: "2026-08-25", to: "2026-08-31" })).toEqual({
      from: new Date(2026, 7, 25),
      to: new Date(2026, 8, 1),
    });
  });

  it("rejects an inverted or impossible calendar range", () => {
    expect(calendarRangeToInstantPeriod({ from: "2026-08-31", to: "2026-08-25" })).toBeNull();
    expect(parseCalendarDate("2026-02-30")).toBeNull();
    expect(parseCalendarDate("26-08-31")).toBeNull();
  });

  it("builds a club-scoped game-profile query from the calendar range", () => {
    expect(
      gameProfileQueryFromRange({
        externalClubId: "10754",
        range: { from: "2026-08-25", to: "2026-08-31" },
      }),
    ).toEqual({
      externalClubId: "10754",
      from: new Date(2026, 7, 25).toISOString(),
      to: new Date(2026, 8, 1).toISOString(),
    });
  });

  it("normalizes missing or invalid search params to the default week", () => {
    expect(normalizePlayerStatisticsSearch({}, now)).toEqual({
      from: "2026-08-25",
      to: "2026-08-31",
    });
    expect(normalizePlayerStatisticsSearch({ from: "2026-08-31", to: "2026-08-25" }, now)).toEqual({
      from: "2026-08-25",
      to: "2026-08-31",
    });
    expect(normalizePlayerStatisticsSearch({ from: "2026-08-01", to: "2026-08-07" }, now)).toEqual({
      from: "2026-08-01",
      to: "2026-08-07",
    });
  });

  it("refuses to build a query from an invalid calendar range", () => {
    expect(() =>
      gameProfileQueryFromRange({
        range: { from: "2026-08-31", to: "2026-08-25" },
      }),
    ).toThrow("player statistics range must be a valid calendar period");
  });
});
