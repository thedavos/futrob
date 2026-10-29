import type { PlayerPersonalStatsDto } from "@futrob/api-contracts";

type Metrics = PlayerPersonalStatsDto["totals"];
type Rates = PlayerPersonalStatsDto["averages"];
type Flags = PlayerPersonalStatsDto["partial"];

const ZERO_TOTALS: Metrics = {
  goals: 0,
  assists: 0,
  shots: 0,
  passAttempts: 0,
  passesMade: 0,
  tackleAttempts: 0,
  tacklesMade: 0,
  saves: 0,
  yellowCards: 0,
  redCards: 0,
  mvpAwards: 0,
  rating: 0,
};

const COMPLETE_RATES: Rates = {
  goals: 2,
  assists: 0,
  shots: 0,
  passAttempts: 0,
  passesMade: 0,
  tackleAttempts: 0,
  tacklesMade: 0,
  saves: 0,
  yellowCards: 0,
  redCards: 0,
  mvpAwards: 0,
  rating: 7.5,
};

const NO_PARTIAL: Flags = {
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

/** Official personal stats for one competition. A real zero stays zero. A null rate is unobserved. */
export function playerCompetitionStatsFixture(input?: {
  readonly minutes?: number;
  readonly totals?: Partial<Metrics>;
  readonly averages?: Partial<Rates>;
  readonly partial?: Partial<Flags>;
}): PlayerPersonalStatsDto {
  return {
    playerProfileId: "player-1",
    matchesPlayed: 6,
    minutes: input?.minutes ?? 540,
    totals: { ...ZERO_TOTALS, goals: 12, ...input?.totals },
    averages: { ...COMPLETE_RATES, ...input?.averages },
    per90: { ...COMPLETE_RATES, ...input?.averages },
    partial: { ...NO_PARTIAL, ...input?.partial },
    sourceRevisionMax: 3,
    updatedAt: "2026-10-20T21:30:00.000Z",
  };
}
