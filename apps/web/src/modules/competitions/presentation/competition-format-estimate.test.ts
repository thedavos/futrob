import { describe, expect, it } from "vite-plus/test";
import { estimateFixtureCounts } from "./competition-format-estimate.ts";

describe("estimateFixtureCounts", () => {
  it("estimates a Swiss field as ⌈log₂ n⌉ rounds of ⌊n/2⌋ encounters, whatever the legs", () => {
    expect(estimateFixtureCounts("swiss", 8, "double")).toEqual({ rounds: 3, encounters: 12 });
    expect(estimateFixtureCounts("swiss", 9, "single")).toEqual({ rounds: 4, encounters: 16 });
    expect(estimateFixtureCounts("swiss", 2, "single")).toEqual({ rounds: 1, encounters: 1 });
  });

  it("counts a single round robin", () => {
    expect(estimateFixtureCounts("league", 8, "single")).toEqual({
      rounds: 7,
      encounters: 28,
    });
    expect(estimateFixtureCounts("league", 5, "single")).toEqual({
      rounds: 5,
      encounters: 10,
    });
  });

  it("doubles a round robin when teams meet home and away", () => {
    expect(estimateFixtureCounts("league", 8, "double")).toEqual({
      rounds: 14,
      encounters: 56,
    });
  });

  it("counts a single-elimination bracket without using rounds", () => {
    expect(estimateFixtureCounts("knockout", 8, "double")).toEqual({
      rounds: 3,
      encounters: 7,
    });
  });

  it("adds a group stage and a knockout of the top two from each group", () => {
    expect(estimateFixtureCounts("groups-knockout", 8, "single")).toEqual({
      rounds: 5,
      encounters: 15,
    });
  });

  it("adds playoffs for half the field, rounded down to a power of two", () => {
    expect(estimateFixtureCounts("league-playoffs", 8, "single")).toEqual({
      rounds: 9,
      encounters: 31,
    });
  });

  it("returns nothing when the team count cannot estimate a calendar", () => {
    expect(estimateFixtureCounts("league", 1, "single")).toBeNull();
  });
});
