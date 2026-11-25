import type {
  FixtureEncounterDto,
  GetCurrentCompetitionFixtureResponse,
} from "@futrob/api-contracts";

/** Story and test data only. Fictitious Teams; never shipped as product data. */

const PLAN = "league-plan";
const STAGE = `${PLAN}:stage:1`;

const TEAMS = [
  ["team-atlas", "Atlas FC"],
  ["team-norte", "Norte United"],
  ["team-eclipse", "Eclipse Club"],
  ["team-barrio", "Barrio Once"],
  ["team-rayo", "Rayo Esports"],
  ["team-sur", "Distrito Sur"],
  ["team-union", "Unión Club"],
  ["team-origen", "Origen FC"],
] as const;

type Kickoff = readonly [home: string, away: string, scheduledStartAt: string];

/**
 * Matchdays in Europe/Madrid (UTC+1 in November). Matchday 2 has a 00:15 kickoff that is
 * still the 13th in UTC but already the 14th in Madrid; matchday 3 packs three
 * Encounters into one evening.
 */
const MATCHDAYS: readonly (readonly Kickoff[])[] = [
  [
    ["team-atlas", "team-norte", "2026-11-09T20:00:00.000Z"],
    ["team-eclipse", "team-barrio", "2026-11-09T20:30:00.000Z"],
    ["team-rayo", "team-sur", "2026-11-10T20:00:00.000Z"],
    ["team-union", "team-origen", "2026-11-10T20:30:00.000Z"],
  ],
  [
    ["team-norte", "team-eclipse", "2026-11-12T20:00:00.000Z"],
    ["team-barrio", "team-atlas", "2026-11-12T20:30:00.000Z"],
    ["team-sur", "team-union", "2026-11-13T20:00:00.000Z"],
    ["team-origen", "team-rayo", "2026-11-13T23:15:00.000Z"],
  ],
  [
    ["team-atlas", "team-eclipse", "2026-11-16T19:30:00.000Z"],
    ["team-norte", "team-barrio", "2026-11-16T20:00:00.000Z"],
    ["team-rayo", "team-union", "2026-11-16T20:30:00.000Z"],
    ["team-sur", "team-origen", "2026-12-01T20:00:00.000Z"],
  ],
];

function encounter(round: number, order: number, [home, away, at]: Kickoff): FixtureEncounterDto {
  return {
    id: `${STAGE}:round:${round}:encounter:${order}`,
    stageId: STAGE,
    roundId: `${STAGE}:round:${round}`,
    order,
    home: { kind: "team", teamId: home },
    away: { kind: "team", teamId: away },
    scheduledStartAt: at,
    officialMatchCount: 2,
    series: null,
  };
}

/** A league across three matchdays and two months, kickoffs read in Europe/Madrid. */
export const leagueFixture: GetCurrentCompetitionFixtureResponse = {
  fixture: {
    id: PLAN,
    revision: 1,
    status: "active",
    generationKey: "competition-1:1",
    organizationId: "org-1",
    competitionId: "competition-1",
    rulesVersion: 1,
    generationVersion: 1,
    format: "league",
    timeZone: "Europe/Madrid",
    homeAndAway: true,
    seed: TEAMS.map(([teamId]) => teamId),
    stages: [
      {
        id: STAGE,
        kind: "league",
        order: 1,
        rounds: MATCHDAYS.map((kickoffs, index) => ({
          id: `${STAGE}:round:${index + 1}`,
          stageId: STAGE,
          number: index + 1,
          scheduledStartAt: kickoffs[0]?.[2] ?? "2026-11-09T20:00:00.000Z",
          encounters: kickoffs.map((kickoff, order) => encounter(index + 1, order + 1, kickoff)),
        })),
      },
    ],
  },
  teams: TEAMS.map(([teamId, name]) => ({ teamId, name })),
};

/** «Now» for stories and tests: Sunday 8 November 2026, the day before matchday 1. */
export const FIXTURE_CALENDAR_NOW = new Date("2026-11-08T12:00:00.000Z");

const PLAYOFFS_PLAN = "league-playoffs-plan";
const LIGA_STAGE = `${PLAYOFFS_PLAN}:stage:1`;
const PLAYOFFS_STAGE = `${PLAYOFFS_PLAN}:stage:2`;

const VERANO_TEAMS = [
  ["team-condores", "Cóndores FC"],
  ["team-quipu", "Sporting Quipu"],
  ["team-inti", "Inti United"],
  ["team-pumas", "Atlético Pumas"],
  ["team-vicuna", "Real Vicuña"],
  ["team-llama", "Deportivo Llama"],
] as const;

const VERANO_LIGA_ROUNDS: readonly (readonly Kickoff[])[] = [
  [
    ["team-condores", "team-quipu", "2026-06-08T01:00:00.000Z"],
    ["team-inti", "team-pumas", "2026-06-08T01:00:00.000Z"],
    ["team-vicuna", "team-llama", "2026-06-08T01:00:00.000Z"],
  ],
  [
    ["team-inti", "team-condores", "2026-06-15T01:00:00.000Z"],
    ["team-quipu", "team-llama", "2026-06-15T01:00:00.000Z"],
    ["team-vicuna", "team-pumas", "2026-06-15T01:00:00.000Z"],
  ],
  [
    ["team-condores", "team-llama", "2026-06-22T01:00:00.000Z"],
    ["team-vicuna", "team-inti", "2026-06-22T01:00:00.000Z"],
    ["team-quipu", "team-pumas", "2026-06-22T01:00:00.000Z"],
  ],
  [
    ["team-vicuna", "team-condores", "2026-06-29T01:00:00.000Z"],
    ["team-llama", "team-pumas", "2026-06-29T01:00:00.000Z"],
    ["team-quipu", "team-inti", "2026-06-29T01:00:00.000Z"],
  ],
  [
    ["team-condores", "team-pumas", "2026-07-06T01:00:00.000Z"],
    ["team-quipu", "team-vicuna", "2026-07-06T01:00:00.000Z"],
    ["team-llama", "team-inti", "2026-07-06T01:00:00.000Z"],
  ],
];

const VERANO_PLAYOFFS_ROUNDS: readonly (readonly Kickoff[])[] = [
  [
    ["team-vicuna", "team-inti", "2026-07-13T01:00:00.000Z"],
    ["team-pumas", "team-llama", "2026-07-13T01:00:00.000Z"],
  ],
  [["team-vicuna", "team-llama", "2026-07-20T01:00:00.000Z"]],
];

function veranoEncounter(
  stageId: string,
  round: number,
  order: number,
  [home, away, at]: Kickoff,
): FixtureEncounterDto {
  return {
    id: `${stageId}:round:${round}:encounter:${order}`,
    stageId,
    roundId: `${stageId}:round:${round}`,
    order,
    home: { kind: "team", teamId: home },
    away: { kind: "team", teamId: away },
    scheduledStartAt: at,
    officialMatchCount: 1,
    series: null,
  };
}

/**
 * Multi-stage Liga + Playoffs schedule in America/Lima (UTC-5): 5 Sunday matchdays plus
 * Semifinals and Final (18 encounters across 7 dates).
 */
export const leaguePlayoffsFixture: GetCurrentCompetitionFixtureResponse = {
  fixture: {
    id: PLAYOFFS_PLAN,
    revision: 1,
    status: "active",
    generationKey: "competition-verano:1",
    organizationId: "org-1",
    competitionId: "competition-1",
    rulesVersion: 1,
    generationVersion: 1,
    format: "league-playoffs",
    timeZone: "America/Lima",
    homeAndAway: false,
    seed: VERANO_TEAMS.map(([teamId]) => teamId),
    stages: [
      {
        id: LIGA_STAGE,
        kind: "league",
        order: 1,
        rounds: VERANO_LIGA_ROUNDS.map((kickoffs, index) => ({
          id: `${LIGA_STAGE}:round:${index + 1}`,
          stageId: LIGA_STAGE,
          number: index + 1,
          scheduledStartAt: kickoffs[0]?.[2] ?? "2026-06-08T01:00:00.000Z",
          encounters: kickoffs.map((kickoff, order) =>
            veranoEncounter(LIGA_STAGE, index + 1, order + 1, kickoff),
          ),
        })),
      },
      {
        id: PLAYOFFS_STAGE,
        kind: "playoffs",
        order: 2,
        rounds: VERANO_PLAYOFFS_ROUNDS.map((kickoffs, index) => ({
          id: `${PLAYOFFS_STAGE}:round:${index + 1}`,
          stageId: PLAYOFFS_STAGE,
          number: index + 1,
          scheduledStartAt: kickoffs[0]?.[2] ?? "2026-07-13T01:00:00.000Z",
          encounters: kickoffs.map((kickoff, order) =>
            veranoEncounter(PLAYOFFS_STAGE, index + 1, order + 1, kickoff),
          ),
        })),
      },
    ],
  },
  teams: VERANO_TEAMS.map(([teamId, name]) => ({ teamId, name })),
};

/** «Now» during the multi-stage tournament: Saturday 4 July 2026, right before Matchday 5. */
export const LEAGUE_PLAYOFFS_NOW = new Date("2026-07-04T15:00:00.000Z");
