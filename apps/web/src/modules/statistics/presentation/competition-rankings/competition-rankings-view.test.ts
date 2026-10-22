import { describe, expect, it } from "vite-plus/test";
import { rankingsFixture, teamDetailFixture } from "./competition-rankings.fixtures.ts";
import {
  formatRankingValue,
  rankingFormatters,
  rankingNamesFromTeams,
  rankingNamesRestriction,
  rankingTeamIds,
  selectRankingSnapshot,
} from "./competition-rankings-view.ts";

describe("competition rankings view model", () => {
  it("selects a kind and reports a missing snapshot as not computed", () => {
    expect(selectRankingSnapshot(rankingsFixture, "goalkeeper")?.rows).toHaveLength(1);
    expect(selectRankingSnapshot({ rankings: [] }, "scorer")).toBeNull();
  });

  it("lists each Team once and skips rows without a Team", () => {
    expect(rankingTeamIds(selectRankingSnapshot(rankingsFixture, "scorer"))).toEqual([
      "team-cuervos",
      "team-halcones",
    ]);
    expect(rankingTeamIds(null)).toEqual([]);
  });

  it("takes names only from roster presentation", () => {
    const names = rankingNamesFromTeams([teamDetailFixture("team-cuervos")]);
    expect(names.players.get("profile-lucia")).toBe("Lucía Pérez");
    expect(names.teams.get("team-cuervos")).toBe("Cuervos FC");
    expect(names.players.has("profile-unknown")).toBe(false);
  });

  it("tells whether no, some or every Team refused its roster", () => {
    expect(rankingNamesRestriction(0, 2)).toBe("none");
    expect(rankingNamesRestriction(1, 2)).toBe("some");
    expect(rankingNamesRestriction(2, 2)).toBe("all");
  });

  it("formats rating as an average and every other kind as a count", () => {
    const formatters = rankingFormatters("es");
    expect(formatRankingValue("rating", 7.4666, formatters)).toBe("7,47");
    expect(formatRankingValue("rating", 8, formatters)).toBe("8,0");
    expect(formatRankingValue("scorer", 12, formatters)).toBe("12");
  });
});
