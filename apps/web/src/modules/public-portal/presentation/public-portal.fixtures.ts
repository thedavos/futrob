import type {
  GetPublicBracketResponse,
  GetPublicRankingResponse,
  GetPublicRulesResponse,
  GetPublicStandingsResponse,
  PublicCalendarEntryDto,
  PublicCompetitionDto,
} from "@futrob/api-contracts";
import type { PortalRef } from "./public-portal-model.ts";

export const portalRefFixture: PortalRef = {
  organizationSlug: "liga-norte",
  competitionKey: "cmp_apertura",
};

export const publicCompetitionFixture: PublicCompetitionDto = {
  name: "Liga Norte Apertura",
  status: "published",
  format: "league-playoffs",
  platform: "playstation",
  gameEdition: "FC 26",
  region: "south-america",
  timeZone: "America/Lima",
  startsOn: "2026-11-02",
  endsOn: "2026-12-20",
  approvedTeamCount: 4,
  coverPreset: "league",
};

export const publicCalendarFixture: readonly PublicCalendarEntryDto[] = [
  {
    roundNumber: 1,
    scheduledStartAt: "2026-11-03T01:00:00.000Z",
    homeTeamName: "Atlético Norte",
    awayTeamName: "Real Sur",
    status: "official",
    score: [{ homeGoals: 2, awayGoals: 1 }],
  },
  {
    roundNumber: 1,
    scheduledStartAt: "2026-11-03T02:30:00.000Z",
    homeTeamName: "Deportivo Este",
    awayTeamName: "Unión Oeste",
    status: "awaiting_result",
    score: null,
  },
  {
    roundNumber: 2,
    scheduledStartAt: "2026-11-10T01:00:00.000Z",
    homeTeamName: "Real Sur",
    awayTeamName: "Deportivo Este",
    status: "scheduled",
    score: null,
  },
  {
    roundNumber: 2,
    scheduledStartAt: "2026-11-10T02:30:00.000Z",
    homeTeamName: "Unión Oeste",
    awayTeamName: "Atlético Norte",
    status: "scheduled",
    score: null,
  },
];

export const publicStandingsFixture: GetPublicStandingsResponse["standings"] = {
  rows: [
    {
      position: 1,
      teamName: "Atlético Norte",
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goalsFor: 2,
      goalsAgainst: 1,
      goalDifference: 1,
      points: 3,
      form: ["win"],
    },
    {
      position: 2,
      teamName: "Real Sur",
      played: 1,
      wins: 0,
      draws: 0,
      losses: 1,
      goalsFor: 1,
      goalsAgainst: 2,
      goalDifference: -1,
      points: 0,
      form: ["loss"],
    },
  ],
  swiss: null,
  updatedAt: "2026-11-03T03:00:00.000Z",
};

export const publicBracketFixture: NonNullable<GetPublicBracketResponse["bracket"]> = {
  timeZone: "America/Lima",
  stages: [
    {
      kind: "playoffs",
      rounds: [
        {
          number: 1,
          scheduledStartAt: "2026-12-01T01:00:00.000Z",
          encounters: [
            {
              order: 1,
              scheduledStartAt: "2026-12-01T01:00:00.000Z",
              officialMatchCount: 2,
              home: { kind: "stage_rank", rank: 1 },
              away: { kind: "stage_rank", rank: 4 },
              status: "scheduled",
              score: null,
            },
            {
              order: 2,
              scheduledStartAt: "2026-12-01T02:30:00.000Z",
              officialMatchCount: 1,
              home: { kind: "team", name: "Real Sur" },
              away: { kind: "bye" },
              status: "closed",
              score: null,
            },
          ],
        },
        {
          number: 2,
          scheduledStartAt: "2026-12-08T01:00:00.000Z",
          encounters: [
            {
              order: 1,
              scheduledStartAt: "2026-12-08T01:00:00.000Z",
              officialMatchCount: 1,
              home: { kind: "winner", roundNumber: 1, order: 1 },
              away: { kind: "team", name: "Real Sur" },
              status: "scheduled",
              score: null,
            },
          ],
        },
      ],
    },
  ],
};

export const publicRankingFixture: GetPublicRankingResponse["ranking"] = {
  kind: "scorer",
  rows: [
    {
      position: 1,
      playerName: "Nico_10",
      teamName: "Atlético Norte",
      value: 2,
      matchesPlayed: 1,
    },
    { position: 2, playerName: "ElTanque", teamName: "Real Sur", value: 1, matchesPlayed: 1 },
  ],
  updatedAt: "2026-11-03T03:00:00.000Z",
};

export const publicRulesFixture: GetPublicRulesResponse["rules"] = {
  format: "league-playoffs",
  teams: { min: 4, max: 8 },
  stages: [
    {
      stage: "regular",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      officialMatchesPerEncounter: 1,
      resolutionMode: "independent_matches",
      rescheduling: { allowed: true, maxPerTeam: 2, minimumNoticeHours: 24 },
    },
    {
      stage: "knockout",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      officialMatchesPerEncounter: 2,
      resolutionMode: "aggregate_score",
      rescheduling: { allowed: false },
    },
  ],
  maxRosterSize: null,
};
