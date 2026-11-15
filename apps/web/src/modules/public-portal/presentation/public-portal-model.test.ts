import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { portalRefFixture, publicCalendarFixture } from "./public-portal.fixtures.ts";
import {
  bracketSideLabel,
  calendarRounds,
  kickoffLabel,
  latestResults,
  parsePortalRef,
  portalPath,
  portalSections,
  scoreLabel,
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

  it("builds the public path under the organization slug", () => {
    expect(portalPath(portalRefFixture)).toBe("/liga-norte/cmp_apertura");
    expect(portalPath(portalRefFixture, "standings")).toBe("/liga-norte/cmp_apertura/standings");
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
  it("groups by round in kick-off order", () => {
    const rounds = calendarRounds([...publicCalendarFixture].reverse());
    expect(rounds.map((round) => round.roundNumber)).toEqual([1, 2]);
    expect(rounds[0]?.entries.map((entry) => entry.homeTeamName)).toEqual([
      "Atlético Norte",
      "Deportivo Este",
    ]);
  });

  it("picks upcoming by status and latest results among official ones", () => {
    expect(upcomingEntries(publicCalendarFixture, 1).map((entry) => entry.homeTeamName)).toEqual([
      "Real Sur",
    ]);
    expect(latestResults(publicCalendarFixture, 3).map((entry) => entry.homeTeamName)).toEqual([
      "Atlético Norte",
    ]);
  });

  it("formats scores per official match and kick-off in the competition time zone", () => {
    expect(scoreLabel([{ homeGoals: 2, awayGoals: 1 }])).toBe("2–1");
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

describe("bracket sides", () => {
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
});
