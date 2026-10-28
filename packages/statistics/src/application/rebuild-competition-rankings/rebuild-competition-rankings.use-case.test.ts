import { describe, expect, it, vi } from "vite-plus/test";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ClockPort,
  type EventPublisherPort,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import type {
  RankingEligibilityConfig,
  RankingSnapshot,
} from "../../domain/entities/ranking-snapshot.ts";
import type { TeamMatchContribution } from "../../domain/entities/team-match-contribution.ts";
import type { CompetitionRankingEligibilityReaderPort } from "../../domain/ports/competition-ranking-eligibility-reader.port.ts";
import { RebuildCompetitionRankingsUseCase } from "./rebuild-competition-rankings.use-case.ts";

const competitionId = asCompetitionId("competition-1");

describe("RebuildCompetitionRankingsUseCase eligibility", () => {
  it("applies the defaults when no reader is wired", async () => {
    const { run } = harness();

    const snapshots = await run({});

    expect(snapshots[0]?.eligibility).toEqual({ minimumMatches: 3, minimumTeamMinutesRatio: 0.6 });
    expect(scorerPlayers(snapshots)).toEqual([]);
  });

  it("applies the defaults when the competition configures nothing", async () => {
    const { run } = harness({ configured: null });

    const snapshots = await run({});

    expect(snapshots[0]?.eligibility).toEqual({ minimumMatches: 3, minimumTeamMinutesRatio: 0.6 });
    expect(scorerPlayers(snapshots)).toEqual([]);
  });

  it("applies the minimums configured in the competition rules", async () => {
    const { run, reader } = harness({
      configured: { minimumMatches: 1, minimumTeamMinutesRatio: 0.6 },
    });

    const snapshots = await run({});

    expect(reader.getRankingEligibility).toHaveBeenCalledWith(competitionId);
    expect(snapshots[0]?.eligibility).toEqual({ minimumMatches: 1, minimumTeamMinutesRatio: 0.6 });
    expect(scorerPlayers(snapshots)).toEqual(["short-minutes"]);
  });

  it("replaces the competition minimums when the caller passes an override", async () => {
    const { run } = harness({ configured: { minimumMatches: 1, minimumTeamMinutesRatio: 0.25 } });

    const snapshots = await run({ eligibility: { minimumMatches: 5 } });

    expect(snapshots[0]?.eligibility).toEqual({ minimumMatches: 5, minimumTeamMinutesRatio: 0.6 });
    expect(scorerPlayers(snapshots)).toEqual([]);
  });
});

function scorerPlayers(snapshots: readonly RankingSnapshot[]): string[] {
  return (
    snapshots
      .find((snapshot) => snapshot.kind === "scorer")
      ?.rows.map((row) => row.playerProfileId) ?? []
  );
}

function harness(options: { readonly configured?: RankingEligibilityConfig | null } = {}) {
  const reader = {
    getRankingEligibility: vi.fn(async () => options.configured ?? null),
  } satisfies CompetitionRankingEligibilityReaderPort;
  let saved: readonly RankingSnapshot[] = [];
  const useCase = new RebuildCompetitionRankingsUseCase({
    contributions: {
      listByCompetition: async () => [
        playerContribution({ id: "short-minutes", minutesPlayed: 40, goals: 2 }),
        playerContribution({ id: "starter", minutesPlayed: 90, goals: 0 }),
      ],
    } as never,
    teamContributions: {
      listByCompetition: async () => [teamClock()],
    } as never,
    rankings: {
      replaceForCompetition: async (_id: unknown, snapshots: readonly RankingSnapshot[]) => {
        saved = snapshots;
      },
    } as never,
    eligibility: options.configured === undefined ? undefined : reader,
    eventPublisher: {
      publish: async () => {},
      publishMany: async () => {},
    } satisfies EventPublisherPort,
    transaction: { runInTransaction: (work) => work() } satisfies TransactionPort,
    clock: { now: () => new Date("2026-08-13T12:00:00.000Z") } satisfies ClockPort,
  });
  return {
    reader,
    run: async (input: { readonly eligibility?: Partial<RankingEligibilityConfig> }) => {
      await useCase.execute({ competitionId, ...input });
      return saved;
    },
  };
}

function playerContribution(input: {
  readonly id: string;
  readonly minutesPlayed: number;
  readonly goals: number;
}): PlayerMatchContribution {
  return {
    id: input.id,
    officialResultId: "result-1",
    revision: 1,
    encounterId: asEncounterId("encounter-1"),
    competitionId,
    organizationId: asOrganizationId("organization-1"),
    officialSlot: 1,
    playerProfileId: input.id,
    gameAccountId: "account-1",
    teamId: asTeamId("home-team"),
    correlationStatus: "matched",
    externalPlayerId: input.id,
    displayName: input.id,
    externalClubId: "club-1",
    platform: "common-gen5",
    gameEdition: "fc-26",
    position: "midfielder",
    minutesPlayed: input.minutesPlayed,
    goals: input.goals,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: 7,
  };
}

function teamClock(): TeamMatchContribution {
  return {
    id: "encounter-1-home",
    officialResultId: "result-1",
    revision: 1,
    encounterId: asEncounterId("encounter-1"),
    competitionId,
    organizationId: asOrganizationId("organization-1"),
    officialSlot: 1,
    teamId: asTeamId("home-team"),
    correlationStatus: "matched",
    side: "home",
    resolutionMode: "independent_matches",
    externalClubId: "club-1",
    goalsFor: 1,
    goalsAgainst: 0,
    platform: "common-gen5",
    gameEdition: "fc-26",
    minutesPlayed: 90,
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
    isMvp: null,
    rating: null,
  };
}
