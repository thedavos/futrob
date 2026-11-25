import { describe, expect, it } from "vite-plus/test";
import { competitionGameEditionLabel } from "../competition-labels.ts";
import {
  awaitingResultEncounters,
  competitionProgress,
  countEntries,
  officializedEncounters,
  overviewTeams,
  pendingTasks,
  pendingTotal,
  recentOfficialEncounters,
  upcomingEncounters,
} from "./competition-overview-model.ts";
import {
  finishedEncounters,
  overviewActivities,
  overviewActivity,
  overviewCompetition,
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

  it("lists official encounters most recent first and counts officialized totals", () => {
    expect(
      recentOfficialEncounters(finishedEncounters.encounters, 2).map((e) => e.round.number),
    ).toEqual([6, 5]);
    expect(officializedEncounters(overviewEncounters.encounters)).toEqual({
      official: 1,
      total: 5,
    });
    expect(officializedEncounters(finishedEncounters.encounters)).toEqual({
      official: 3,
      total: 3,
    });
  });

  it("does not reorder the caller's encounters", () => {
    const before = overviewEncounters.encounters.map((encounter) => encounter.encounterId);
    upcomingEncounters(overviewEncounters.encounters);
    recentOfficialEncounters(overviewEncounters.encounters);
    awaitingResultEncounters(overviewEncounters.encounters);
    expect(overviewEncounters.encounters.map((encounter) => encounter.encounterId)).toEqual(before);
  });

  it("computes progress from encounters once scheduled, or registration capacity before fixture", () => {
    expect(
      competitionProgress(
        { status: "ready", data: overviewCompetition },
        { status: "ready", data: overviewEncounters.encounters },
        { status: "ready", data: overviewEntries },
      ),
    ).toEqual({ kind: "encounters", completed: false, official: 1, total: 5, percent: 20 });

    expect(
      competitionProgress(
        { status: "ready", data: { ...overviewCompetition, status: "registration" } },
        { status: "ready", data: [] },
        { status: "ready", data: overviewEntries },
      ),
    ).toEqual({ kind: "teams", approved: 2, max: 8, percent: 25 });

    expect(
      competitionProgress(
        { status: "ready", data: { ...overviewCompetition, status: "draft" } },
        { status: "ready", data: [] },
        { status: "ready", data: overviewEntries },
      ),
    ).toBeNull();
  });

  it("does not mark an active competition completed when every paired encounter is official", () => {
    // Semifinals official, final not paired yet (tie under review): the listing omits it.
    const activeCompetition = { ...overviewCompetition, status: "published" as const };
    expect(
      competitionProgress(
        { status: "ready", data: activeCompetition },
        { status: "ready", data: finishedEncounters.encounters },
        { status: "ready", data: overviewEntries },
      ),
    ).toEqual({ kind: "encounters", completed: false, official: 3, total: 3, percent: 100 });

    expect(
      competitionProgress(
        { status: "ready", data: { ...overviewCompetition, status: "finished" } },
        { status: "ready", data: finishedEncounters.encounters },
        { status: "ready", data: overviewEntries },
      ),
    ).toMatchObject({ kind: "encounters", completed: true });
  });

  it("finds the encounters that started without an official result", () => {
    expect(
      awaitingResultEncounters(overviewEncounters.encounters).map((e) => e.round.number),
    ).toEqual([2]);
  });

  it("counts a pending entry once, not again through its open activity", () => {
    const pendingEntries = countEntries(overviewEntries).pending;
    expect(pendingEntries).toBe(1);
    expect(pendingTasks(overviewActivities).map((entry) => entry.id)).toEqual(["dispute"]);
    expect(
      pendingTotal(pendingEntries, 0, { activities: overviewActivities, nextCursor: null }),
    ).toEqual({ count: 2, partial: false });
  });

  it("counts every open task read, not just the ones the card renders", () => {
    const activities = Array.from({ length: 7 }, (_, index) =>
      overviewActivity({ id: `dispute-${index}`, kind: "match_dispute" }),
    );
    expect(pendingTotal(0, 1, { activities, nextCursor: null })).toEqual({
      count: 8,
      partial: false,
    });
    expect(pendingTotal(0, 1, { activities, nextCursor: "next" })).toEqual({
      count: 8,
      partial: true,
    });
  });

  it("puts entries to review first and leaves rejected teams out", () => {
    expect(overviewTeams(teamsFixture).map((item) => item.team.name)).toEqual([
      "Atlas",
      "Nova FC",
      "Cuervos FC",
    ]);
    expect(overviewTeams(teamsFixture, 1).map((item) => item.team.name)).toEqual(["Atlas"]);
  });

  it("normalizes compact FC edition strings while preserving custom labels", () => {
    expect(competitionGameEditionLabel("fc26")).toBe("FC 26");
    expect(competitionGameEditionLabel("FC27")).toBe("FC 27");
    expect(competitionGameEditionLabel("fc 26")).toBe("FC 26");
    expect(competitionGameEditionLabel("FC 26")).toBe("FC 26");
    expect(competitionGameEditionLabel("  Club Cup 2026 ")).toBe("Club Cup 2026");
  });
});
