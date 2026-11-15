import type { TeamCompetitionStatsDto } from "@futrob/api-contracts";
import type { TeamNames } from "./competition-team-stats-state.ts";

type Metrics = TeamCompetitionStatsDto["totals"];
type Rates = TeamCompetitionStatsDto["averages"];
type PartialFlags = TeamCompetitionStatsDto["partial"];

const NO_PARTIAL: PartialFlags = {
  goals: false,
  assists: false,
  shots: false,
  passAttempts: false,
  passesMade: false,
  tackleAttempts: false,
  tacklesMade: false,
  saves: false,
  yellowCards: false,
  redCards: false,
  mvpAwards: false,
  rating: false,
  minutes: false,
};

/** Builds a DTO with averages and per-90 rates consistent with the totals and sample. */
export function teamStatsFixture(input: {
  readonly teamId: string;
  readonly matchesPlayed: number;
  readonly totals: Metrics;
  readonly ratingAverage: number | null;
  readonly unobserved?: readonly (keyof Metrics)[];
  readonly partial?: { readonly [K in keyof PartialFlags]?: boolean };
  readonly updatedAt?: string;
}): TeamCompetitionStatsDto {
  const minutes = input.matchesPlayed * 90;
  const unobserved = new Set(input.unobserved ?? []);
  const rate = (metric: keyof Metrics): number | null =>
    unobserved.has(metric) || input.matchesPlayed === 0
      ? null
      : input.totals[metric] / input.matchesPlayed;
  const rates = (rating: number | null): Rates => ({
    goals: rate("goals"),
    assists: rate("assists"),
    shots: rate("shots"),
    passAttempts: rate("passAttempts"),
    passesMade: rate("passesMade"),
    tackleAttempts: rate("tackleAttempts"),
    tacklesMade: rate("tacklesMade"),
    saves: rate("saves"),
    yellowCards: rate("yellowCards"),
    redCards: rate("redCards"),
    mvpAwards: rate("mvpAwards"),
    rating,
  });
  // Every fixture match lasts 90 minutes, so per-match and per-90 rates coincide.
  const averages = rates(input.ratingAverage);
  const per90 = rates(null);
  const totals = { ...input.totals };
  for (const metric of unobserved) totals[metric] = 0;
  return {
    teamId: input.teamId,
    competitionId: "competition-1",
    organizationId: "org-1",
    matchesPlayed: input.matchesPlayed,
    minutes,
    totals,
    averages,
    per90,
    partial: { ...NO_PARTIAL, ...input.partial },
    sourceRevisionMax: input.matchesPlayed,
    updatedAt: input.updatedAt ?? "2026-10-20T21:30:00.000Z",
  };
}

function metrics(values: Metrics): Metrics {
  return values;
}

export const TEAM_NAMES: TeamNames = {
  "team-cuervos": "Cuervos FC",
  "team-maderas": "Maderas FC",
  "team-halcones": "Club Atlético Halcones del Pacífico",
  "team-lobos": "Lobos del Norte",
};

export const competitionTeamStatsFixture: readonly TeamCompetitionStatsDto[] = [
  teamStatsFixture({
    teamId: "team-cuervos",
    matchesPlayed: 4,
    ratingAverage: 7.42,
    totals: metrics({
      goals: 11,
      assists: 8,
      shots: 41,
      passAttempts: 512,
      passesMade: 431,
      tackleAttempts: 96,
      tacklesMade: 61,
      saves: 9,
      yellowCards: 3,
      redCards: 0,
      mvpAwards: 3,
      rating: 29.68,
    }),
  }),
  teamStatsFixture({
    teamId: "team-maderas",
    matchesPlayed: 4,
    ratingAverage: 6.95,
    totals: metrics({
      goals: 7,
      assists: 5,
      shots: 33,
      passAttempts: 470,
      passesMade: 380,
      tackleAttempts: 101,
      tacklesMade: 70,
      saves: 14,
      yellowCards: 6,
      redCards: 1,
      mvpAwards: 1,
      rating: 27.8,
    }),
  }),
  teamStatsFixture({
    teamId: "team-halcones",
    matchesPlayed: 3,
    ratingAverage: 7.1,
    partial: { shots: true, tacklesMade: true },
    totals: metrics({
      goals: 11,
      assists: 6,
      shots: 18,
      passAttempts: 350,
      passesMade: 290,
      tackleAttempts: 70,
      tacklesMade: 33,
      saves: 6,
      yellowCards: 2,
      redCards: 0,
      mvpAwards: 0,
      rating: 21.3,
    }),
  }),
  teamStatsFixture({
    teamId: "team-lobos",
    matchesPlayed: 3,
    ratingAverage: null,
    unobserved: ["saves"],
    partial: { rating: true, saves: true },
    totals: metrics({
      goals: 0,
      assists: 0,
      shots: 12,
      passAttempts: 300,
      passesMade: 210,
      tackleAttempts: 80,
      tacklesMade: 49,
      saves: 0,
      yellowCards: 5,
      redCards: 2,
      mvpAwards: 0,
      rating: 0,
    }),
    updatedAt: "2026-10-21T18:05:00.000Z",
  }),
];

/** Teams whose approved matches recorded every metric. */
export const completeTeamStatsFixture: readonly TeamCompetitionStatsDto[] =
  competitionTeamStatsFixture
    .filter((team) => team.teamId !== "team-lobos")
    .map((team) => ({ ...team, partial: NO_PARTIAL }));
