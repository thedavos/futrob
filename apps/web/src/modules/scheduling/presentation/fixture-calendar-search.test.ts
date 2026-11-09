import { describe, expect, it } from "vite-plus/test";
import { fixtureCalendarSearchSchema } from "./fixture-calendar-search.ts";

describe("fixtureCalendarSearchSchema", () => {
  it("preserves a complete query for return navigation and shared links", () => {
    const search = {
      view: "month",
      team: "atlas",
      round: "round-3",
      month: "2026-11",
      day: "2026-11-16",
    };
    expect(fixtureCalendarSearchSchema.parse(search)).toEqual(search);
  });

  it.each(["2026-02-30", "2026-11-31", "2026-13-01", "not-a-date", "0000-01-01"])(
    "ignores invalid day %s without discarding valid filters",
    (day) => {
      expect(fixtureCalendarSearchSchema.parse({ day, team: "atlas", view: "rounds" })).toEqual({
        day: undefined,
        team: "atlas",
        view: "rounds",
      });
    },
  );

  it("discards invalid view, month and filter values", () => {
    const search = fixtureCalendarSearchSchema.parse({
      view: "radial",
      month: "2026-00",
      team: [],
      round: "",
    });
    expect(search).toEqual({
      view: undefined,
      month: undefined,
      team: undefined,
      round: undefined,
    });
  });

  it("accepts leap days", () => {
    expect(fixtureCalendarSearchSchema.parse({ day: "2028-02-29" }).day).toBe("2028-02-29");
  });
});
