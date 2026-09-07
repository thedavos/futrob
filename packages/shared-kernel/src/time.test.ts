import { describe, expect, it } from "vite-plus/test";
import {
  addDays,
  calendarDaysBetween,
  compareByTime,
  compareTime,
  daysFromNow,
  daysFromNowIso,
  MS_PER_DAY,
  TIME_SORT_DIRECTION,
} from "./time.ts";

const noon = new Date("2026-01-15T12:00:00.000Z");

describe("time", () => {
  it("adds whole days to a date", () => {
    expect(addDays(noon, 2).getTime()).toBe(noon.getTime() + 2 * MS_PER_DAY);
    expect(addDays(noon, -1).getTime()).toBe(noon.getTime() - MS_PER_DAY);
  });

  it("builds a date and ISO string relative to now", () => {
    expect(daysFromNow(3, noon).toISOString()).toBe("2026-01-18T12:00:00.000Z");
    expect(daysFromNowIso(-2, noon)).toBe("2026-01-13T12:00:00.000Z");
  });

  it("counts local calendar days between two dates", () => {
    const morning = new Date(2026, 0, 15, 1);
    const night = new Date(2026, 0, 15, 23);
    const nextMorning = new Date(2026, 0, 16, 1);
    expect(calendarDaysBetween(morning, night)).toBe(0);
    expect(calendarDaysBetween(morning, nextMorning)).toBe(1);
    expect(calendarDaysBetween(nextMorning, morning)).toBe(-1);
  });

  it("compares dates ascending", () => {
    const earlier = new Date("2026-01-01T00:00:00.000Z");
    const later = new Date("2026-01-02T00:00:00.000Z");
    expect(compareTime(earlier, later)).toBeLessThan(0);
    expect(compareTime(later, earlier)).toBeGreaterThan(0);
    expect(compareTime(earlier, earlier)).toBe(0);
  });

  it("builds sort comparators by a selected instant", () => {
    const items = [
      { id: "old", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: "new", createdAt: new Date("2026-01-12T00:00:00.000Z") },
    ];
    expect([...items].sort(compareByTime((item) => item.createdAt)).map((item) => item.id)).toEqual(
      ["old", "new"],
    );
    expect(
      [...items]
        .sort(compareByTime((item) => item.createdAt, TIME_SORT_DIRECTION.desc))
        .map((item) => item.id),
    ).toEqual(["new", "old"]);
  });
});
