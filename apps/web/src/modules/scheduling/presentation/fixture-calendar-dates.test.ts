import { describe, expect, it } from "vite-plus/test";
import {
  formatDateKey,
  formatMonthKey,
  monthWeeks,
  shiftMonth,
  weekdayNames,
  zonedDateKey,
} from "./fixture-calendar-dates.ts";

describe("zonedDateKey", () => {
  it("reads the calendar day in the competition's zone, not UTC", () => {
    const kickoff = "2026-11-13T23:15:00.000Z";
    expect(zonedDateKey(kickoff, "UTC")).toBe("2026-11-13");
    expect(zonedDateKey(kickoff, "Europe/Madrid")).toBe("2026-11-14");
    expect(zonedDateKey("2026-10-12T03:30:00.000Z", "America/Lima")).toBe("2026-10-11");
  });

  it("follows daylight saving changes", () => {
    // Madrid is UTC+2 until 25 October 2026 and UTC+1 after it.
    expect(zonedDateKey("2026-10-24T22:30:00.000Z", "Europe/Madrid")).toBe("2026-10-25");
    expect(zonedDateKey("2026-10-25T22:30:00.000Z", "Europe/Madrid")).toBe("2026-10-25");
  });
});

describe("monthWeeks", () => {
  it("starts weeks on Monday and pads days outside the month", () => {
    // November 2026 starts on a Sunday: six empty cells, then the 1st.
    const weeks = monthWeeks("2026-11");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("knows leap years", () => {
    expect(monthWeeks("2028-02").flat().filter(Boolean).at(-1)).toBe("2028-02-29");
    expect(monthWeeks("2026-02").flat().filter(Boolean).at(-1)).toBe("2026-02-28");
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 0)).toBe("2026-11");
  });
});

describe("date labels", () => {
  it("formats a date key as the same day whatever the reader's zone", () => {
    expect(formatDateKey("2026-11-09", "en", { month: "long", day: "numeric" })).toBe("November 9");
    expect(formatDateKey("2026-11-01", "es", { weekday: "long" })).toBe("domingo");
  });

  it("names the month with a capital in both languages", () => {
    expect(formatMonthKey("2026-11", "es")).toBe("Noviembre de 2026");
    expect(formatMonthKey("2026-11", "en")).toBe("November 2026");
  });

  it("lists weekdays from Monday", () => {
    expect(weekdayNames("en", "short")).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });
});
