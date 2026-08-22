import { Effect } from "effect";
import {
  GetMyPersonalStatisticsUseCase,
  STATISTICS_PERMISSION,
  type PlayerCompetitionStats,
  type PlayerMatchContribution,
  type PlayerPersonalStats,
  type PlayerStatisticRates,
  type PlayerStatisticTotals,
} from "@futrob/statistics";
import { asActorId } from "@futrob/shared-kernel";
import type {
  AuthorizationDecision,
  AuthorizationPort,
  ClockPort,
  EffectiveAccess,
} from "@futrob/shared-kernel";
import { print, printJson } from "../lib/print.ts";

const ACTOR = asActorId("actor_smoke");

function zeroTotals(): PlayerStatisticTotals {
  return {
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
}

function nullRates(): PlayerStatisticRates {
  return {
    goals: null,
    assists: null,
    shots: null,
    passAttempts: null,
    passesMade: null,
    tackleAttempts: null,
    tacklesMade: null,
    saves: null,
    yellowCards: null,
    redCards: null,
    mvpAwards: null,
    rating: null,
  };
}

const noPartialFlags = {
  minutes: false,
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
} as const;

const fakePersonalStats: PlayerPersonalStats = {
  playerProfileId: "profile_1",
  matchesPlayed: 10,
  minutes: 900,
  totals: zeroTotals(),
  averages: nullRates(),
  per90: nullRates(),
  partial: noPartialFlags,
  sourceRevisionMax: 3,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const allowAllAuthorization: AuthorizationPort = {
  decide: (request): Promise<AuthorizationDecision> =>
    Promise.resolve({
      allowed: true,
      permission: request.permission,
      scope: request.scope,
      reason: "allowed",
    }),
  getEffectiveAccess: (input): Promise<EffectiveAccess> =>
    Promise.resolve({ actorId: input.actorId, scope: input.scope, roles: [], permissions: [] }),
};

const clock: ClockPort = { now: () => new Date("2026-08-21T00:00:00.000Z") };

async function smoke(): Promise<number> {
  const useCase = new GetMyPersonalStatisticsUseCase({
    personalStats: {
      upsert: () => Promise.resolve(),
      findByPlayerProfile: (playerProfileId: string) =>
        Promise.resolve(playerProfileId === "profile_1" ? fakePersonalStats : null),
    },
    competitionStats: {
      upsert: (_stats: PlayerCompetitionStats) => Promise.resolve(),
      findByPlayerAndCompetition: () => Promise.resolve(null),
      listByPlayer: () => Promise.resolve([]),
    },
    contributions: {
      saveMany: (_contributions: readonly PlayerMatchContribution[]) => Promise.resolve(),
      deleteByOfficialResultRevision: () => Promise.resolve(),
      deleteByEncounterRevision: () => Promise.resolve(),
      deleteByCompetition: () => Promise.resolve(),
      listByPlayerProfile: () => Promise.resolve([]),
      listByOfficialResult: () => Promise.resolve([]),
      listByEncounter: () => Promise.resolve([]),
      listByCompetition: () => Promise.resolve([]),
      listMatched: () => Promise.resolve([]),
      listMatchedPage: () => Promise.resolve({ items: [], nextCursor: null }),
    },
    profiles: {
      findByActor: (actorId: string) =>
        Promise.resolve(actorId === ACTOR ? { id: "profile_1" } : null),
    },
    authorization: allowAllAuthorization,
    clock,
  });

  const stats = await useCase.execute({ actorId: ACTOR });
  if (!stats || stats.playerProfileId !== "profile_1") {
    return 1;
  }

  const missingActor = await useCase.execute({ actorId: asActorId("unknown") });
  if (missingActor !== null) {
    return 1;
  }

  print("statistics-smoke ok");
  printJson({
    actorId: ACTOR,
    permission: STATISTICS_PERMISSION.readOwn,
    matchesPlayed: stats.matchesPlayed,
  });
  return 0;
}

export function run(): Effect.Effect<number> {
  return Effect.promise(smoke);
}
