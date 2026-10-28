import { describe, expect, it } from "vite-plus/test";
import {
  awaitingResultEncounters,
  countEntries,
  overviewTeams,
  upcomingEncounters,
} from "./competition-overview-model.ts";
import {
  overviewEncounters,
  overviewEntries,
  overviewTeams as teamsFixture,
} from "./competition-overview.fixtures.ts";

describe("competition overview model", () => {
  it("counts approved and pending entries and ignores rejected ones", () => {
    expect(countEntries(overviewEntries)).toEqual({ approved: 2, pending: 1 });
    expect(countEntries([])).toEqual({ approved: 0, pending: 0 });
  });

  it("lists only scheduled encounters, earliest first, up to the limit", () => {
    const upcoming = upcomingEncounters(overviewEncounters.encounters, 2);
    expect(upcoming.map((encounter) => encounter.round.number)).toEqual([3, 4]);
    expect(upcomingEncounters(overviewEncounters.encounters).map((e) => e.round.number)).toEqual([
      3, 4, 5,
    ]);
  });

  it("does not reorder the caller's encounters", () => {
    const before = overviewEncounters.encounters.map((encounter) => encounter.encounterId);
    upcomingEncounters(overviewEncounters.encounters);
    awaitingResultEncounters(overviewEncounters.encounters);
    expect(overviewEncounters.encounters.map((encounter) => encounter.encounterId)).toEqual(before);
  });

  it("finds the encounters that started without an official result", () => {
    expect(
      awaitingResultEncounters(overviewEncounters.encounters).map((e) => e.round.number),
    ).toEqual([2]);
  });

  it("puts entries to review first and leaves rejected teams out", () => {
    expect(overviewTeams(teamsFixture).map((item) => item.team.name)).toEqual([
      "Atlas",
      "Nova FC",
      "Cuervos FC",
    ]);
    expect(overviewTeams(teamsFixture, 1).map((item) => item.team.name)).toEqual(["Atlas"]);
  });
});
