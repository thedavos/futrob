import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import {
  portalRefFixture,
  publicBracketFixture,
  publicCalendarFixture,
  publicRankingFixture,
  publicStandingsFixture,
} from "./public-portal.fixtures.ts";
import {
  layoutPublicBracketStage,
  publicBracketChampionName,
  publicBracketSideScore,
} from "./public-portal-bracket-model.ts";
import {
  bracketSideLabel,
  calendarDays,
  calendarRounds,
  featuredCoverEncounter,
  filterCalendarEntries,
  kickoffLabel,
  latestResults,
  organizationSlugLabel,
  parsePortalRef,
  portalCalendarProgress,
  portalPath,
  portalRankingKindFromSearch,
  portalSectionFromPathname,
  portalSections,
  publicRankingSummary,
  publicStandingsCut,
  publicStandingsSummary,
  scoreLabel,
  scoreSummary,
  upcomingEntries,
} from "./public-portal-model.ts";

const t = createTranslator("es");

describe("portal sections", () => {
  it("omits the bracket for formats without an elimination stage", () => {
    expect(portalSections("league")).not.toContain("bracket");
    expect(portalSections("swiss")).not.toContain("bracket");
    expect(portalSections("knockout")).toContain("bracket");
    expect(portalSections("league-playoffs")).toEqual([
      "cover",
      "calendar",
      "standings",
      "bracket",
      "teams",
      "rankings",
      "rules",
    ]);
  });

  it("builds the public path under the organization slug and formats the slug label", () => {
    expect(portalPath(portalRefFixture)).toBe("/liga-norte/cmp_apertura");
    expect(portalPath(portalRefFixture, "standings")).toBe("/liga-norte/cmp_apertura/standings");
    expect(organizationSlugLabel("liga-andina")).toBe("Liga Andina");
  });

  it("reads the section from the pathname while identity is still loading", () => {
    expect(portalSectionFromPathname("/liga-norte/cmp_apertura")).toBe("cover");
    expect(portalSectionFromPathname("/liga-norte/cmp_apertura/")).toBe("cover");
    expect(portalSectionFromPathname("/liga-norte/cmp_apertura/standings")).toBe("standings");
    expect(portalSectionFromPathname("/liga-norte/cmp_apertura/rankings/")).toBe("rankings");
  });

  it("validates the ranking kind from search params and defaults to scorer only when missing or invalid", () => {
    expect(portalRankingKindFromSearch("?kind=assister")).toBe("assister");
    expect(portalRankingKindFromSearch("?kind=goalkeeper")).toBe("goalkeeper");
    expect(portalRankingKindFromSearch("")).toBe("scorer");
    expect(portalRankingKindFromSearch("?kind=invalid")).toBe("scorer");
  });

  it("rejects params no published competition can have", () => {
    expect(parsePortalRef({ organizationSlug: "liga-norte", competitionKey: "x" })).toEqual({
      organizationSlug: "liga-norte",
      competitionKey: "x",
    });
    expect(parsePortalRef({ organizationSlug: "a".repeat(65), competitionKey: "x" })).toBeNull();
    expect(parsePortalRef({ organizationSlug: "liga", competitionKey: "" })).toBeNull();
  });
});

describe("calendar", () => {
  it("groups by round and local competition date in kick-off order", () => {
    const rounds = calendarRounds([...publicCalendarFixture].reverse());
    expect(rounds.map((round) => round.roundNumber)).toEqual([1, 2]);
    expect(rounds[0]?.entries.map((entry) => entry.homeTeamName)).toEqual([
      "Atlético Norte",
      "Deportivo Este",
    ]);
    const days = calendarDays(publicCalendarFixture, "America/Lima");
    expect(days.map((day) => day.dateKey)).toEqual(["2026-11-02", "2026-11-09"]);
  });

  it("filters by team, round, and status and computes progress", () => {
    expect(
      filterCalendarEntries(publicCalendarFixture, {
        team: "Atlético Norte",
        round: null,
        status: "official",
      }),
    ).toHaveLength(1);
    expect(portalCalendarProgress(publicCalendarFixture, "published")).toEqual({
      official: 1,
      total: 4,
      percent: 25,
      completed: false,
    });
    expect(featuredCoverEncounter(publicCalendarFixture)?.homeTeamName).toBe("Atlético Norte");
  });

  it("picks upcoming by status and latest results among official ones", () => {
    expect(upcomingEntries(publicCalendarFixture, 1).map((entry) => entry.homeTeamName)).toEqual([
      "Real Sur",
    ]);
    expect(latestResults(publicCalendarFixture, 3).map((entry) => entry.homeTeamName)).toEqual([
      "Atlético Norte",
    ]);
  });

  it("formats scores per official match, leader side, and kick-off in the competition time zone", () => {
    expect(scoreLabel([{ homeGoals: 2, awayGoals: 1 }])).toBe("2–1");
    expect(scoreSummary([{ homeGoals: 2, awayGoals: 1 }])?.leader).toBe("home");
    expect(
      scoreLabel([
        { homeGoals: 2, awayGoals: 1 },
        { homeGoals: 0, awayGoals: 0 },
      ]),
    ).toBe("2–1 · 0–0");
    // 01:00 UTC is 20:00 the previous day in Lima.
    expect(kickoffLabel("2026-11-03T01:00:00.000Z", "America/Lima", "es")).toContain("20:00");
  });
});

describe("standings and rankings summaries", () => {
  it("computes standings KPI summary", () => {
    const summary = publicStandingsSummary(publicStandingsFixture);
    expect(summary.leader).toEqual({ teamName: "Atlético Norte", points: 3, leadOverSecond: 3 });
    expect(summary.bestAttack?.teamNames).toEqual(["Atlético Norte"]);
    expect(summary.bestDefense?.teamNames).toEqual(["Atlético Norte"]);
    expect(summary.officialMatches).toBe(1);
  });

  it("computes ranking KPI summary", () => {
    const summary = publicRankingSummary(publicRankingFixture);
    expect(summary.leader).toEqual({
      playerName: "Nico_10",
      teamName: "Atlético Norte",
      value: 2,
      lead: 1,
    });
    expect(summary.bestPerMatch?.rate).toBe(2);
  });
});

describe("bracket sides and layout", () => {
  it("names every side without internal ids", () => {
    expect(bracketSideLabel({ kind: "team", name: "Real Sur" }, t)).toBe("Real Sur");
    expect(bracketSideLabel({ kind: "bye" }, t)).toBe("Descanso");
    expect(bracketSideLabel({ kind: "winner", roundNumber: 1, order: 2 }, t)).toBe(
      "Ganador del cruce 2 (ronda 1)",
    );
    expect(bracketSideLabel({ kind: "group_rank", group: "A", rank: 1 }, t)).toBe(
      "1.º del grupo A",
    );
    expect(bracketSideLabel({ kind: "pending" }, t)).toBe("Por definir");
  });

  it("connects winner and advanced team wires and hides scores on byes", () => {
    const [stage] = publicBracketFixture.stages;
    if (!stage) throw new Error("expected stage");
    const layout = layoutPublicBracketStage(stage);
    expect(layout.wires).toHaveLength(2);
    expect(layout.champion).not.toBeNull();
    expect(publicBracketChampionName(layout)).toBeNull();
    const byeNode = layout.nodes.find((node) => node.encounter.away.kind === "bye");
    expect(byeNode).toBeDefined();
    expect(
      publicBracketSideScore(
        { ...byeNode!.encounter, score: [{ homeGoals: 3, awayGoals: 0 }] },
        "home",
      ),
    ).toBeNull();
  });
});

describe("public outcomes come from the fixture, not from the visible rows", () => {
  it("closes the season from the competition status, not from the published encounters", () => {
    // A knockout with both semifinals official lists 2 of 2 until the final is drawn.
    const allOfficial = publicCalendarFixture.map((entry) => ({
      ...entry,
      status: "official" as const,
    }));
    expect(portalCalendarProgress(allOfficial, "published")?.completed).toBe(false);
    expect(portalCalendarProgress(allOfficial, "finished")?.completed).toBe(true);
  });

  it("draws the qualifying cut only where the fixture sets one", () => {
    const [template] = publicStandingsFixture.rows;
    if (!template) throw new Error("fixture shape");
    const six = Array.from({ length: 6 }, (_, index) => ({
      ...template,
      position: index + 1,
      teamName: `Equipo ${index + 1}`,
    }));
    expect(publicStandingsCut({ rows: six, qualifyingSpots: 2 })).toBe(2);
    expect(publicStandingsCut({ rows: six, qualifyingSpots: null })).toBeNull();
    expect(publicStandingsCut({ rows: six.slice(0, 2), qualifyingSpots: 2 })).toBeNull();
  });

  it("keeps the champion pending on a tied series and crowns the side the API resolved", () => {
    const final = (winner: "home" | "away" | null) =>
      layoutPublicBracketStage({
        kind: "knockout",
        rounds: [
          {
            number: 1,
            scheduledStartAt: "2026-12-01T01:00:00.000Z",
            encounters: [
              {
                order: 1,
                scheduledStartAt: "2026-12-01T01:00:00.000Z",
                officialMatchCount: 2,
                home: { kind: "team", name: "Atlético Norte" },
                away: { kind: "team", name: "Real Sur" },
                status: "official",
                // 3–0 then 0–1: a tie in independent mode, the home side on aggregate.
                score: [
                  { homeGoals: 3, awayGoals: 0 },
                  { homeGoals: 0, awayGoals: 1 },
                ],
                winner,
              },
            ],
          },
        ],
      });
    expect(publicBracketChampionName(final(null))).toBeNull();
    expect(publicBracketChampionName(final("home"))).toBe("Atlético Norte");
  });
});
