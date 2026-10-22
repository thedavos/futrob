import { describe, expect, it } from "vite-plus/test";
import {
  hasPartialTeamStats,
  latestTeamStatsUpdate,
  sortTeamStats,
  teamStatsCell,
  teamStatsLeader,
} from "./competition-team-stats-model.ts";
import { competitionTeamStatsFixture, TEAM_NAMES } from "./competition-team-stats.fixtures.ts";

const [cuervos, , halcones, lobos] = competitionTeamStatsFixture;
const nameOf = (teamId: string) => TEAM_NAMES[teamId] ?? teamId;
const compare = (a: string, b: string) => a.localeCompare(b, "es");

describe("competition team statistics model", () => {
  it("keeps a real zero and marks never-observed totals as unavailable", () => {
    expect(teamStatsCell(lobos!, "totals", "goals")).toEqual({ value: 0, partial: false });
    expect(teamStatsCell(lobos!, "totals", "saves")).toEqual({ value: null, partial: false });
    expect(teamStatsCell(lobos!, "averages", "saves").value).toBeNull();
  });

  it("reads rating as the per-match average in every view", () => {
    expect(teamStatsCell(cuervos!, "totals", "rating").value).toBe(7.42);
    expect(teamStatsCell(cuervos!, "per90", "rating").value).toBe(7.42);
    expect(teamStatsCell(lobos!, "totals", "rating")).toEqual({ value: null, partial: false });
  });

  it("flags partial metrics only where a value is shown", () => {
    expect(teamStatsCell(halcones!, "totals", "shots")).toEqual({ value: 18, partial: true });
    expect(teamStatsCell(halcones!, "averages", "goals").partial).toBe(false);
    expect(hasPartialTeamStats(competitionTeamStatsFixture)).toBe(true);
    expect(hasPartialTeamStats([cuervos!])).toBe(false);
  });

  it("sorts by the shown value, keeps unavailable rows last and breaks ties by name", () => {
    const desc = sortTeamStats(
      competitionTeamStatsFixture,
      "totals",
      { column: "goals", direction: "desc" },
      nameOf,
      compare,
    ).map((team) => team.teamId);
    expect(desc).toEqual(["team-halcones", "team-cuervos", "team-maderas", "team-lobos"]);

    const rating = (direction: "asc" | "desc") =>
      sortTeamStats(
        competitionTeamStatsFixture,
        "totals",
        { column: "rating", direction },
        nameOf,
        compare,
      ).map((team) => team.teamId);
    expect(rating("desc").at(-1)).toBe("team-lobos");
    expect(rating("asc").at(-1)).toBe("team-lobos");

    const byName = sortTeamStats(
      competitionTeamStatsFixture,
      "totals",
      { column: "team", direction: "asc" },
      nameOf,
      compare,
    ).map((team) => nameOf(team.teamId));
    expect(byName).toEqual([
      "Club Atlético Halcones del Pacífico",
      "Cuervos FC",
      "Lobos del Norte",
      "Maderas FC",
    ]);
  });

  it("returns tied leaders and null when no team has the metric", () => {
    expect(teamStatsLeader(competitionTeamStatsFixture, "totals", "goals")).toEqual({
      value: 11,
      teamIds: ["team-cuervos", "team-halcones"],
      partial: false,
    });
    expect(teamStatsLeader([lobos!], "totals", "rating")).toBeNull();
  });

  it("reports the latest projection update", () => {
    expect(latestTeamStatsUpdate(competitionTeamStatsFixture)).toBe("2026-10-21T18:05:00.000Z");
    expect(latestTeamStatsUpdate([])).toBeNull();
  });
});
