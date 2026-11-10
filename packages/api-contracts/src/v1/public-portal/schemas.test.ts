import { describe, expect, it } from "vite-plus/test";
import {
  getPublicBracketResponseSchema,
  getPublicCalendarResponseSchema,
  getPublicRankingResponseSchema,
  getPublicTeamsResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicStandingsResponseSchema,
  listPublicCompetitionsResponseSchema,
  publicCompetitionSchema,
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
  form: ["win"],
} as const;

const calendarEntry = {
  roundNumber: 1,
  scheduledStartAt: "2026-11-08T20:00:00.000Z",
  homeTeamName: "Barranco FC",
  awayTeamName: "Surquillo United",
  status: "scheduled",
  score: null,
} as const;

describe("public portal wire schemas", () => {
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
    const body = (row: object) => ({ standings: { rows: [row], swiss: null, updatedAt: null } });
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

  it("admits the Swiss tie-break fields and progress, but no team ids on them", () => {
    const body = (swiss: object | null) => ({
      standings: {
        rows: [{ ...standingRow, buchholz: 6, byes: 1, withdrawn: true }],
        swiss,
        updatedAt: null,
      },
    });
    const progress = { roundsTotal: 3, roundsCompleted: 1, currentRound: 2, isFinal: false };
    expect(getPublicStandingsResponseSchema.safeParse(body(progress)).success).toBe(true);
    expect(
      getPublicStandingsResponseSchema.safeParse(body({ ...progress, withdrawnTeamIds: ["t"] }))
        .success,
    ).toBe(false);
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

  it("admits only goals on a calendar score", () => {
    const body = (score: unknown) => ({
      calendar: {
        timeZone: "America/Lima",
        entries: [{ ...calendarEntry, status: "official", score }],
      },
    });
    expect(
      getPublicCalendarResponseSchema.safeParse(body([{ homeGoals: 3, awayGoals: 1 }])).success,
    ).toBe(true);
    expect(
      getPublicCalendarResponseSchema.safeParse(
        body([{ homeGoals: 3, awayGoals: 1, providerMatchRef: "ea-1" }]),
      ).success,
    ).toBe(false);
  });

  it("refuses internal references on bracket sides, rankings and teams", () => {
    const encounter = {
      order: 1,
      scheduledStartAt: "2026-11-08T20:00:00.000Z",
      officialMatchCount: 1,
      home: { kind: "team", name: "Barranco FC" },
      away: { kind: "group_rank", group: "A", rank: 2 },
      status: "scheduled",
      score: null,
    };
    const bracket = (value: object) => ({
      bracket: {
        timeZone: "UTC",
        stages: [
          {
            kind: "knockout",
            rounds: [
              { number: 1, scheduledStartAt: encounter.scheduledStartAt, encounters: [value] },
            ],
          },
        ],
      },
    });
    expect(getPublicBracketResponseSchema.safeParse(bracket(encounter)).success).toBe(true);
    for (const side of [
      { kind: "team", name: "Barranco FC", teamId: "team-1" },
      { kind: "winner", encounterId: "encounter-1" },
      { kind: "group_rank", group: "group-internal-1", rank: 1 },
    ]) {
      expect(
        getPublicBracketResponseSchema.safeParse(bracket({ ...encounter, home: side })).success,
      ).toBe(false);
    }

    const row = {
      position: 1,
      playerName: "AnaGol_10",
      teamName: null,
      value: 3,
      matchesPlayed: 2,
    };
    const ranking = (value: object) => ({
      ranking: { kind: "scorer", rows: [value], updatedAt: null },
    });
    expect(getPublicRankingResponseSchema.safeParse(ranking(row)).success).toBe(true);
    expect(
      getPublicRankingResponseSchema.safeParse(ranking({ ...row, playerProfileId: "profile-1" }))
        .success,
    ).toBe(false);
    expect(
      getPublicTeamsResponseSchema.safeParse({ teams: [{ name: "Barranco FC", teamId: "t" }] })
        .success,
    ).toBe(false);
  });

  it("only admits publicly visible statuses", () => {
    for (const status of ["draft", "registration", "archived"]) {
      expect(publicCompetitionSchema.safeParse({ ...competition, status }).success).toBe(false);
    }
  });

  it.each([
    ["organizationId", "org-1"],
    ["status", "draft"],
    ["name", "Copa Barranco"],
  ])("rejects %s on a public listing so a sitemap only carries an address", (key, value) => {
    const listing = {
      organizationSlug: "liga-norte",
      competitionKey: "competition-1",
      updatedAt: "2026-11-08T20:00:00.000Z",
    };
    expect(
      listPublicCompetitionsResponseSchema.safeParse({ competitions: [listing] }).success,
    ).toBe(true);
    expect(
      listPublicCompetitionsResponseSchema.safeParse({
        competitions: [{ ...listing, [key]: value }],
      }).success,
    ).toBe(false);
  });
});
