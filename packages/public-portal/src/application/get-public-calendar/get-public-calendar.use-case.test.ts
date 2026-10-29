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
        official: false,
      },
      {
        roundNumber: 1,
        scheduledStartAt: new Date("2026-11-08T20:00:00.000Z"),
        homeTeamId: BARRANCO,
        awayTeamId: SURQUILLO,
        official: false,
      },
      {
        roundNumber: 1,
        scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
        homeTeamId: BARRANCO,
        awayTeamId: SURQUILLO,
        official: true,
      },
      {
        roundNumber: 1,
        scheduledStartAt: new Date("2026-11-08T10:00:00.000Z"),
        homeTeamId: SURQUILLO,
        awayTeamId: BARRANCO,
        official: false,
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
        },
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-08T10:00:00.000Z"),
          homeTeamName: "Surquillo United",
          awayTeamName: "Barranco FC",
          status: "awaiting_result",
        },
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-08T20:00:00.000Z"),
          homeTeamName: "Barranco FC",
          awayTeamName: "Surquillo United",
          status: "scheduled",
        },
        {
          roundNumber: 2,
          scheduledStartAt: new Date("2026-11-15T20:00:00.000Z"),
          homeTeamName: "Surquillo United",
          awayTeamName: "Barranco FC",
          status: "scheduled",
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
          official: false,
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

  it("skips an encounter with a team that has no public name", async () => {
    const result = await new GetPublicCalendarUseCase({
      competitions: publishedReader(competitionSource()),
      calendar: countingCalendar(async () => [
        {
          roundNumber: 1,
          scheduledStartAt: new Date("2026-11-15T20:00:00.000Z"),
          homeTeamId: BARRANCO,
          awayTeamId: MIRAFLORES,
          official: false,
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
