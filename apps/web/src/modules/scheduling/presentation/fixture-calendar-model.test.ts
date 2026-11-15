import { describe, expect, it } from "vite-plus/test";
import { competitionFixtureView, type CompetitionFixtureView } from "./competition-fixture-view.ts";
import { groupsKnockoutFixture } from "./competition-fixture.fixtures.ts";
import { leagueFixture } from "./fixture-calendar.fixtures.ts";
import {
  adjacentFixtureMonth,
  currentFixtureRoundId,
  defaultFixtureDay,
  filterFixtureEntries,
  fixtureCalendarDays,
  fixtureCalendarEntries,
  fixtureCalendarRounds,
  fixtureCalendarTeams,
  fixtureRoundBoards,
  initialFixtureMonth,
  nextFixtureDate,
  NO_FIXTURE_FILTERS,
  validFixtureFilters,
} from "./fixture-calendar-model.ts";

function viewOf(response: Parameters<typeof competitionFixtureView>[0]): CompetitionFixtureView {
  const view = competitionFixtureView(response);
  if (!view) throw new Error("fixture expected");
  return view;
}

const league = viewOf(leagueFixture);
const leagueEntries = fixtureCalendarEntries(league);
const ROUND_2 = "league-plan:stage:1:round:2";

describe("fixtureCalendarDays", () => {
  it("groups Encounters by their day in the competition's zone", () => {
    const days = fixtureCalendarDays(leagueEntries);
    expect(days.map((day) => [day.date, day.entries.length])).toEqual([
      ["2026-11-09", 2],
      ["2026-11-10", 2],
      ["2026-11-12", 2],
      ["2026-11-13", 1],
      // 23:15 UTC on the 13th is 00:15 on the 14th in Madrid.
      ["2026-11-14", 1],
      ["2026-11-16", 3],
      ["2026-12-01", 1],
    ]);
  });

  it("keeps kickoff order inside a day", () => {
    const day = fixtureCalendarDays(leagueEntries).find((item) => item.date === "2026-11-16");
    expect(day?.entries.map((entry) => entry.encounter.scheduledStartAt)).toEqual([
      "2026-11-16T19:30:00.000Z",
      "2026-11-16T20:00:00.000Z",
      "2026-11-16T20:30:00.000Z",
    ]);
  });
});

describe("filters", () => {
  it("keeps a Team's Encounters on either side", () => {
    const atlas = filterFixtureEntries(leagueEntries, { teamId: "team-atlas", roundId: null });
    expect(atlas.map((entry) => entry.encounter.id)).toEqual([
      "league-plan:stage:1:round:1:encounter:1",
      "league-plan:stage:1:round:2:encounter:2",
      "league-plan:stage:1:round:3:encounter:1",
    ]);
  });

  it("combines Team and round", () => {
    const filtered = filterFixtureEntries(leagueEntries, {
      teamId: "team-atlas",
      roundId: ROUND_2,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.date).toBe("2026-11-12");
  });

  it("falls back to everything when a refresh drops the chosen Team or round", () => {
    const teams = fixtureCalendarTeams(league, "es");
    const rounds = fixtureCalendarRounds(league);
    expect(
      validFixtureFilters({ teamId: "team-gone", roundId: "round-gone" }, teams, rounds),
    ).toEqual(NO_FIXTURE_FILTERS);
    expect(validFixtureFilters({ teamId: "team-sur", roundId: ROUND_2 }, teams, rounds)).toEqual({
      teamId: "team-sur",
      roundId: ROUND_2,
    });
  });

  it("offers only named slots as Teams, unnamed ones last", () => {
    const teams = fixtureCalendarTeams(viewOf(groupsKnockoutFixture), "es");
    expect(teams.map((team) => team.name)).toEqual([
      "Club Atlético Halcones del Pacífico",
      "Cuervos FC",
      "Maderas FC",
      null,
    ]);
  });
});

describe("next date and month", () => {
  it("starts at the next day with Encounters", () => {
    expect(nextFixtureDate(leagueEntries, "2026-11-08")).toBe("2026-11-09");
    expect(nextFixtureDate(leagueEntries, "2026-11-11")).toBe("2026-11-12");
    expect(nextFixtureDate(leagueEntries, "2026-12-02")).toBeNull();
  });

  it("opens the month of the next date, or the last month once the fixture is over", () => {
    expect(initialFixtureMonth(leagueEntries, "2026-11-20")).toBe("2026-12");
    expect(initialFixtureMonth(leagueEntries, "2027-03-01")).toBe("2026-12");
    expect(initialFixtureMonth([], "2027-03-01")).toBe("2027-03");
  });

  it("selects the next day in the month, else its first day with Encounters", () => {
    const days = fixtureCalendarDays(leagueEntries);
    expect(defaultFixtureDay(days, "2026-11", "2026-11-11")).toBe("2026-11-12");
    expect(defaultFixtureDay(days, "2026-11", "2026-12-15")).toBe("2026-11-09");
    expect(defaultFixtureDay(days, "2027-01", "2026-11-11")).toBeNull();
  });

  it("jumps across empty months to the nearest one with Encounters", () => {
    const days = fixtureCalendarDays(leagueEntries);
    expect(adjacentFixtureMonth(days, "2027-04", "previous")).toBe("2026-12");
    expect(adjacentFixtureMonth(days, "2026-10", "next")).toBe("2026-11");
    expect(adjacentFixtureMonth(days, "2026-12", "next")).toBeNull();
  });
});

describe("fixtureRoundBoards", () => {
  it("keeps every round under a Team filter, with each round's full date span", () => {
    const [board] = fixtureRoundBoards(league, leagueEntries, {
      teamId: "team-atlas",
      roundId: null,
    });
    expect(
      board?.columns.map((column) => [column.firstDate, column.lastDate, column.entries.length]),
    ).toEqual([
      ["2026-11-09", "2026-11-10", 1],
      ["2026-11-12", "2026-11-14", 1],
      ["2026-11-16", "2026-12-01", 1],
    ]);
  });

  it("narrows to the chosen round and drops stages without it", () => {
    const view = viewOf(groupsKnockoutFixture);
    const entries = fixtureCalendarEntries(view);
    const final = fixtureCalendarRounds(view).at(-1);
    const boards = fixtureRoundBoards(view, entries, { teamId: null, roundId: final?.id ?? "" });
    expect(boards.map((board) => [board.stageKind, board.columns.length])).toEqual([
      ["knockout", 1],
    ]);
  });

  it("marks the round of the next date as current", () => {
    expect(currentFixtureRoundId(leagueEntries, "2026-11-11")).toBe(ROUND_2);
    expect(currentFixtureRoundId(leagueEntries, "2027-01-01")).toBeNull();
  });
});
