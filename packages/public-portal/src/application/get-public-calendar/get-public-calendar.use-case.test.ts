import { describe, expect, it } from "vite-plus/test";
import { GetPublicCalendarUseCase } from "./get-public-calendar.use-case.ts";
import {
  BARRANCO,
  COMPETITION_ID,
  MIRAFLORES,
  ORGANIZATION_ID,
  PUBLIC_KEY,
  SURQUILLO,
  TEAM_NAMES,
  competitionSource,
  countingCalendar,
  publishedReader,
  teamDirectory,
} from "../public-portal.test-helper.ts";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const clock = { now: () => NOW };

describe("GetPublicCalendarUseCase", () => {
  it("lists encounters earliest first with public names and a derived status", async () => {
    const calendar = countingCalendar(async () => [
      {
        roundNumber: 2,
        scheduledStartAt: new Date("2026-11-15T20:00:00.000Z"),
        homeTeamId: SURQUILLO,
        awayTeamId: BARRANCO,
        officialScore: null,
      },
      {
        roundNumber: 1,
        scheduledStartAt: new Date("2026-11-08T20:00:00.000Z"),
        homeTeamId: BARRANCO,
        awayTeamId: SURQUILLO,
        officialScore: null,
      },
      {
        roundNumber: 1,
        scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
        homeTeamId: BARRANCO,
        awayTeamId: SURQUILLO,
        officialScore: [{ homeGoals: 3, awayGoals: 1 }],
      },
      {
        roundNumber: 1,
        scheduledStartAt: new Date("2026-11-08T10:00:00.000Z"),
        homeTeamId: SURQUILLO,
        awayTeamId: BARRANCO,
        officialScore: null,
      },
    ]);
    const result = await new GetPublicCalendarUseCase({
      competitions: publishedReader(competitionSource()),
      calendar,
      teams: teamDirectory(TEAM_NAMES),
      clock,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({
      timeZone: "America/Lima",
      entries: [
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
          homeTeamName: "Barranco FC",
          awayTeamName: "Surquillo United",
          status: "official",
          score: [{ homeGoals: 3, awayGoals: 1 }],
        },
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-08T10:00:00.000Z"),
          homeTeamName: "Surquillo United",
          awayTeamName: "Barranco FC",
          status: "awaiting_result",
          score: null,
        },
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-08T20:00:00.000Z"),
          homeTeamName: "Barranco FC",
          awayTeamName: "Surquillo United",
          status: "scheduled",
          score: null,
        },
        {
          roundNumber: 2,
          scheduledStartAt: new Date("2026-11-15T20:00:00.000Z"),
          homeTeamName: "Surquillo United",
          awayTeamName: "Barranco FC",
          status: "scheduled",
          score: null,
        },
      ],
    });
    expect(calendar.calls).toEqual([COMPETITION_ID]);
  });

  it("exposes only the calendar allowlist and no internal identifiers", async () => {
    const result = await new GetPublicCalendarUseCase({
      competitions: publishedReader(competitionSource()),
      calendar: countingCalendar(async () => [
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-15T20:00:00.000Z"),
          homeTeamId: BARRANCO,
          awayTeamId: SURQUILLO,
          officialScore: null,
          candidates: [{ providerMatchRef: "ea-secret" }],
          fixturePlanId: "plan-secret",
        } as never,
      ]),
      teams: teamDirectory(TEAM_NAMES),
      clock,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(Object.keys(result.value).sort()).toEqual(["entries", "timeZone"]);
    expect(Object.keys(result.value.entries[0] ?? {}).sort()).toEqual([
      "awayTeamName",
      "homeTeamName",
      "roundNumber",
      "scheduledStartAt",
      "score",
      "status",
    ]);
    const wire = JSON.stringify(result.value);
    for (const internal of [
      BARRANCO,
      SURQUILLO,
      COMPETITION_ID,
      ORGANIZATION_ID,
      "ea-secret",
      "plan-secret",
    ]) {
      expect(wire).not.toContain(internal);
    }
  });

  it("shows the official score of each match and nothing else of the result", async () => {
    const result = await new GetPublicCalendarUseCase({
      competitions: publishedReader(competitionSource()),
      calendar: countingCalendar(async () => [
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
          homeTeamId: BARRANCO,
          awayTeamId: SURQUILLO,
          officialScore: [
            { homeGoals: 2, awayGoals: 2, providerMatchRef: "ea-match-secret" } as never,
            { homeGoals: 0, awayGoals: 1 },
          ],
        },
      ]),
      teams: teamDirectory(TEAM_NAMES),
      clock,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value.entries.map((entry) => entry.score)).toEqual([
      [
        { homeGoals: 2, awayGoals: 2 },
        { homeGoals: 0, awayGoals: 1 },
      ],
    ]);
    expect(JSON.stringify(result.isOk() && result.value)).not.toContain("ea-match-secret");
  });

  it("skips an encounter with a team that has no public name", async () => {
    const result = await new GetPublicCalendarUseCase({
      competitions: publishedReader(competitionSource()),
      calendar: countingCalendar(async () => [
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-15T20:00:00.000Z"),
          homeTeamId: BARRANCO,
          awayTeamId: MIRAFLORES,
          officialScore: null,
        },
      ]),
      teams: teamDirectory(new Map([[BARRANCO, "Barranco FC"]])),
      clock,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value.entries).toEqual([]);
  });

  it("does not read the fixture for an unpublished competition", async () => {
    const calendar = countingCalendar(async () => []);
    const result = await new GetPublicCalendarUseCase({
      competitions: publishedReader(competitionSource({ status: "registration" })),
      calendar,
      teams: teamDirectory(TEAM_NAMES),
      clock,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
    expect(calendar.calls).toEqual([]);
  });
});
