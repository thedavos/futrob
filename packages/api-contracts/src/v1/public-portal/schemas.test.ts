import { describe, expect, it } from "vite-plus/test";
import {
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicStandingsResponseSchema,
  publicCalendarEntrySchema,
  publicCompetitionSchema,
  publicStandingRowSchema,
} from "./schemas.ts";

const competition = {
  name: "Copa Barranco",
  status: "published",
  format: "league",
  platform: "playstation",
  gameEdition: "fc26",
  region: "south-america",
  timeZone: "America/Lima",
  startsOn: "2026-11-01",
  endsOn: null,
  approvedTeamCount: 2,
  coverPreset: "league",
} as const;

const standingRow = {
  position: 1,
  teamName: "Barranco FC",
  played: 1,
  wins: 1,
  draws: 0,
  losses: 0,
  goalsFor: 2,
  goalsAgainst: 0,
  goalDifference: 2,
  points: 3,
} as const;

const calendarEntry = {
  roundNumber: 1,
  scheduledStartAt: "2026-11-08T20:00:00.000Z",
  homeTeamName: "Barranco FC",
  awayTeamName: "Surquillo United",
  status: "scheduled",
} as const;

describe("public portal wire schemas", () => {
  it("expose exactly the allowlisted keys", () => {
    expect(Object.keys(publicCompetitionSchema.shape).sort()).toEqual([
      "approvedTeamCount",
      "coverPreset",
      "endsOn",
      "format",
      "gameEdition",
      "name",
      "platform",
      "region",
      "startsOn",
      "status",
      "timeZone",
    ]);
    expect(Object.keys(publicStandingRowSchema.shape).sort()).toEqual([
      "draws",
      "goalDifference",
      "goalsAgainst",
      "goalsFor",
      "losses",
      "played",
      "points",
      "position",
      "teamName",
      "wins",
    ]);
    expect(Object.keys(publicCalendarEntrySchema.shape).sort()).toEqual([
      "awayTeamName",
      "homeTeamName",
      "roundNumber",
      "scheduledStartAt",
      "status",
    ]);
  });

  it.each([
    ["organizationId", "org-1"],
    ["id", "competition-1"],
    ["createdByActorId", "actor-1"],
    ["creationKey", "key-1"],
  ])("rejects %s on the portada instead of passing it through", (key, value) => {
    expect(getPublicCompetitionResponseSchema.safeParse({ competition }).success).toBe(true);
    expect(
      getPublicCompetitionResponseSchema.safeParse({
        competition: { ...competition, [key]: value },
      }).success,
    ).toBe(false);
  });

  it("rejects private statistics keys on a standings row", () => {
    const body = (row: object) => ({ standings: { rows: [row], updatedAt: null } });
    expect(getPublicStandingsResponseSchema.safeParse(body(standingRow)).success).toBe(true);
    for (const extra of [
      { organizationId: "org-1" },
      { teamId: "team-1" },
      { playerProfileId: "profile-1" },
    ]) {
      expect(
        getPublicStandingsResponseSchema.safeParse(body({ ...standingRow, ...extra })).success,
      ).toBe(false);
    }
  });

  it("rejects candidates, slots and provider payloads on a calendar entry", () => {
    const body = (entry: object) => ({ calendar: { timeZone: "America/Lima", entries: [entry] } });
    expect(getPublicCalendarResponseSchema.safeParse(body(calendarEntry)).success).toBe(true);
    for (const extra of [
      { candidates: [] },
      { slots: [] },
      { payload: { secret: 1 } },
      { fixturePlanId: "plan-1" },
    ]) {
      expect(
        getPublicCalendarResponseSchema.safeParse(body({ ...calendarEntry, ...extra })).success,
      ).toBe(false);
    }
  });

  it("only admits publicly visible statuses", () => {
    for (const status of ["draft", "registration", "archived"]) {
      expect(publicCompetitionSchema.safeParse({ ...competition, status }).success).toBe(false);
    }
  });
});
