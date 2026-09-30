import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { createModules, type AppModules } from "@/di/create-modules.ts";
import { runMigrations } from "@/adapters/persistence/migration-runner.ts";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { seedPerformanceModule } from "@/testing/team-performance-module.fixture.ts";
import { officialPerformanceResult } from "@/testing/team-performance.fixture.ts";
import { PostgresTeamPerformanceRankingRepository } from "./team-performance-ranking.repositories.ts";
import { PostgresTeamPerformanceRankingLock } from "./team-performance-lock.ts";
import {
  performancePair,
  performanceScope,
} from "../../../../../packages/statistics/src/domain/policies/team-performance.fixture.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const schema = `team_performance_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: databaseUrl });
const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const actorId = asActorId("actor-1");
const query = { ...performanceScope, actorId };
let modules: AppModules;

describe.skipIf(!databaseUrl)("team performance Postgres composition", () => {
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const client = await pool.connect();
    try {
      await runMigrations(client, {
        directory: resolve(import.meta.dirname, "../../../migrations"),
      });
    } finally {
      client.release();
    }
    await seedActors(pool, "actor-1");
  }, 180_000);

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE organizations, competitions, official_results, player_match_contributions, team_match_contributions, player_competition_stats, player_personal_stats, team_competition_stats, competition_standing_snapshots, ranking_snapshots, team_performance_ranking_snapshots, encounter_schedule_snapshots, provider_matches, official_match_selections CASCADE",
    );
    modules = createModules({
      pool,
      fetcher: async () => {
        throw new Error("Rebuild must never call EA");
      },
      eaClubsBaseUrl: "https://provider.invalid",
    });
    await seedPerformanceModule(modules);
    for (const i of [1, 2, 3]) await prepareSelection(i);
  }, 120_000);

  afterAll(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  });

  it("serializes concurrent approvals across encounters and rebuilds the complete comparable set", async () => {
    const results = await Promise.all([1, 2, 3].map(confirm));
    expect(results.every((result) => result.isOk())).toBe(true);
    const first = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    expect(first?.rows.map((row) => row.score)).toEqual([95, 5]);
    expect(first?.sources).toHaveLength(3);
    const rebuilt =
      await modules.statistics.useCases.rebuildCompetitionStatistics.execute(performanceScope);
    expect(rebuilt.isOk()).toBe(true);
    const second = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    expect(second?.revisionFingerprint).toBe(first?.revisionFingerprint);
    expect(second?.rows).toEqual(first?.rows);
    expect(
      await new PostgresTeamPerformanceRankingRepository(pool).find({
        ...performanceScope,
        organizationId: asOrganizationId("foreign"),
      }),
    ).toBeNull();
  }, 120_000);

  it("rolls back approval, contributions and the persisted snapshot when rebuild fails after writing", async () => {
    await confirm(1);
    await confirm(2);
    const before = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    const rebuild = modules.statistics.useCases.rebuildTeamPerformanceRanking;
    const original = rebuild.execute.bind(rebuild);
    const failure = vi.spyOn(rebuild, "execute").mockImplementationOnce(async (scope) => {
      await original(scope);
      throw new Error("persisted ranking failure");
    });
    try {
      await expect(confirm(3)).rejects.toThrow("persisted ranking failure");
    } finally {
      failure.mockRestore();
    }
    expect(
      await modules.results.results.findLatestByEncounter(performancePair(3)[0]!.encounterId),
    ).toBeNull();
    expect(
      (await modules.results.selections.findLatestByEncounter(performancePair(3)[0]!.encounterId))
        ?.status,
    ).toBe("organizer_review");
    const after = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    expect(after).toEqual(before);
    expect(
      (await pool.query("SELECT COUNT(*)::int AS count FROM team_match_contributions")).rows[0]
        .count,
    ).toBe(4);
  }, 120_000);

  it("rolls back void and deletion when the ranking fails after persistence", async () => {
    for (const i of [1, 2, 3]) await confirm(i);
    const before = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    const rebuild = modules.statistics.useCases.rebuildTeamPerformanceRanking;
    const original = rebuild.execute.bind(rebuild);
    const failure = vi.spyOn(rebuild, "execute").mockImplementationOnce(async (scope) => {
      await original(scope);
      throw new Error("void projection failure");
    });
    try {
      await expect(
        modules.voidOfficialResultAndUnproject.execute({
          actorId,
          encounterId: performancePair(1)[0]!.encounterId,
        }),
      ).rejects.toThrow("void projection failure");
    } finally {
      failure.mockRestore();
    }
    expect(
      (await modules.results.results.findLatestByEncounter(performancePair(1)[0]!.encounterId))
        ?.status,
    ).toBe("approved");
    expect(await modules.statistics.useCases.getTeamPerformanceRanking.execute(query)).toEqual(
      before,
    );
    expect(
      (await pool.query("SELECT COUNT(*)::int AS count FROM team_match_contributions")).rows[0]
        .count,
    ).toBe(6);
  }, 120_000);

  it("correction concurrent with full rebuild cannot be replaced by a stale read; void remains reproducible", async () => {
    for (const i of [1, 2, 3]) await confirm(i);
    const previous = await modules.results.results.findLatestByEncounter(
      performancePair(1)[0]!.encounterId,
    );
    await prepareSelection(1, true);
    await Promise.all([
      confirm(1),
      modules.statistics.useCases.rebuildCompetitionStatistics.execute(performanceScope),
    ]);
    const corrected = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    expect(
      corrected?.sources.find((source) => source.encounterId === "encounter-1")?.revision,
    ).toBe(2);
    expect(corrected?.rows.find((row) => row.teamId === "team-a")?.evidence.resultPoints).toBe(6);
    await modules.statistics.useCases.projectOfficialResult.execute({
      officialResultId: previous!.id,
    });
    expect(
      (await modules.statistics.useCases.getTeamPerformanceRanking.execute(query))
        ?.revisionFingerprint,
    ).toBe(corrected?.revisionFingerprint);
    await modules.voidOfficialResultAndUnproject.execute({
      actorId,
      encounterId: performancePair(1)[0]!.encounterId,
    });
    const voided = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    expect(voided?.rows.every((row) => row.score === null)).toBe(true);
    await modules.statistics.useCases.projectOfficialResult.execute({
      officialResultId: previous!.id,
    });
    await modules.statistics.useCases.rebuildCompetitionStatistics.execute(performanceScope);
    const replayed = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    expect(replayed?.revisionFingerprint).toBe(voided?.revisionFingerprint);
    expect(replayed?.rows).toEqual(voided?.rows);
  }, 180_000);

  it("rolls back full reconstruction when ranking persistence fails after deletions and writes", async () => {
    for (const i of [1, 2, 3]) await confirm(i);
    const before = await modules.statistics.useCases.getTeamPerformanceRanking.execute(query);
    const rebuild = modules.statistics.useCases.rebuildTeamPerformanceRanking;
    const original = rebuild.execute.bind(rebuild);
    const failure = vi.spyOn(rebuild, "execute").mockImplementationOnce(async (scope) => {
      await original(scope);
      throw new Error("full reconstruction failure");
    });
    try {
      await expect(
        modules.statistics.useCases.rebuildCompetitionStatistics.execute(performanceScope),
      ).rejects.toThrow("full reconstruction failure");
    } finally {
      failure.mockRestore();
    }
    expect(await modules.statistics.useCases.getTeamPerformanceRanking.execute(query)).toEqual(
      before,
    );
    expect(
      (await pool.query("SELECT COUNT(*)::int AS count FROM team_match_contributions")).rows[0]
        .count,
    ).toBe(6);
    await expect(
      modules.statistics.useCases.rebuildCompetitionStatistics.execute({
        ...performanceScope,
        organizationId: asOrganizationId("foreign"),
      }),
    ).rejects.toMatchObject({ code: "statistics.team_performance_scope_invalid" });
    expect(await modules.statistics.useCases.getTeamPerformanceRanking.execute(query)).toEqual(
      before,
    );
  }, 180_000);

  it("rejects stale CAS writers on real Postgres and requires transactional locks", async () => {
    for (const i of [1, 2, 3]) await confirm(i);
    const repository = new PostgresTeamPerformanceRankingRepository(pool);
    const first = (await repository.find(performanceScope))!;
    const transaction = new PostgresTransactionPort(pool);
    const lock = new PostgresTeamPerformanceRankingLock(pool);
    await expect(
      lock.runExclusive(performanceScope.competitionId, async () => undefined),
    ).rejects.toThrow("requires a Postgres transaction");
    const next = { ...first, revisionFingerprint: "b".repeat(64) };
    expect(
      await transaction.runInTransaction(() =>
        lock.runExclusive(performanceScope.competitionId, () =>
          repository.replace(next, first.revisionFingerprint),
        ),
      ),
    ).toBe(true);
    expect(
      await transaction.runInTransaction(() =>
        lock.runExclusive(performanceScope.competitionId, () =>
          repository.replace(first, first.revisionFingerprint),
        ),
      ),
    ).toBe(false);
    expect((await repository.find(performanceScope))?.revisionFingerprint).toBe(
      next.revisionFingerprint,
    );
  }, 120_000);
});

function confirm(index: number) {
  return modules.confirmOfficialSelectionAndProject.execute({
    actorId,
    organizationId: performanceScope.organizationId,
    encounterId: performancePair(index)[0]!.encounterId,
  });
}

async function prepareSelection(index: number, corrected = false) {
  const result = officialPerformanceResult(
    performancePair(index, corrected ? { goalsFor: 0, goalsAgainst: 2 } : {}),
  );
  const slot = result.slots[0]!;
  const externalId = `${index}-${corrected ? "corrected" : "initial"}`;
  await new PostgresProviderMatchRepository(pool).upsertMany([
    {
      id: `provider-${externalId}`,
      provider: { key: "ea-clubs", externalMatchId: externalId },
      game: { edition: "fc26", platform: "playstation", mode: "clubs" },
      occurredAt: slot.occurredAt,
      home: { externalClubId: "club-a", name: "Home", goals: slot.homeGoals, imageUrl: null },
      away: { externalClubId: "club-b", name: "Away", goals: slot.awayGoals, imageUrl: null },
      players: slot.players,
      metadata: {
        durationSeconds: 5400,
        wasDisconnected: false,
        winnerByForfeit: false,
        completeness: "complete",
      },
    },
  ]);
  await modules.results.selections.save({
    id: `selection-${externalId}`,
    encounterId: result.encounterId,
    status: "organizer_review",
    proposedAt: new Date(),
    proposedByActorId: actorId,
    slots: [{ officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId } }],
  });
}
