import { describe, expect, it } from "vite-plus/test";
import { asOrganizationId } from "@futrob/shared-kernel";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { InMemoryCompetitionEntryRepository } from "@/adapters/competitions/competition-entry.repositories.ts";
import { InMemoryOfficialResultRepository } from "@/adapters/results/official-result.repository.ts";
import { InMemoryTeamMatchContributionRepository } from "./in-memory.repositories.ts";
import { OfficialTeamPerformanceSource } from "./team-performance-source.ts";
import { InMemoryTeamPerformanceRankingRepository } from "./team-performance-ranking.repositories.ts";
import { InMemoryTeamPerformanceRankingLock } from "./team-performance-lock.ts";
import { NoopTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import {
  RebuildTeamPerformanceRankingUseCase,
  GetTeamPerformanceRankingUseCase,
  STATISTICS_PERMISSION,
} from "@futrob/statistics";
import {
  performanceCompetition,
  performanceEntry,
  officialPerformanceResult,
} from "@/testing/team-performance.fixture.ts";
import {
  performancePair,
  performanceScope,
} from "../../../../../packages/statistics/src/domain/policies/team-performance.fixture.ts";

async function setup() {
  const competitions = new InMemoryCompetitionRepository();
  await competitions.saveDraft(performanceCompetition());
  const entries = new InMemoryCompetitionEntryRepository();
  for (const team of ["team-a", "team-b", "team-c"]) await entries.save(performanceEntry(team));
  const results = new InMemoryOfficialResultRepository();
  const contributions = new InMemoryTeamMatchContributionRepository();
  for (const i of [1, 2, 3]) {
    const pair = performancePair(i);
    await results.save(officialPerformanceResult(pair));
    await contributions.saveMany(pair);
  }
  const reader = {
    getById: results.findById.bind(results),
    getLatestByEncounter: results.findLatestByEncounter.bind(results),
    getApprovedByEncounter: results.findApprovedByEncounter.bind(results),
    listByCompetition: results.listByCompetition.bind(results),
  };
  const sources = new OfficialTeamPerformanceSource({
    competitions,
    entries,
    results: reader,
    contributions,
  });
  const rankings = new InMemoryTeamPerformanceRankingRepository();
  const lock = new InMemoryTeamPerformanceRankingLock();
  const rebuild = new RebuildTeamPerformanceRankingUseCase({
    sources,
    rankings,
    lock,
    transaction: new NoopTransactionPort(),
    clock: { now: () => new Date("2026-09-01T00:00:00Z") },
  });
  return { competitions, entries, results, contributions, sources, rankings, lock, rebuild };
}

describe("official team performance sources and rebuild", () => {
  it("reads authoritative time, persists scores and includes approved teams without data", async () => {
    const { rebuild } = await setup();
    const snapshot = await rebuild.execute(performanceScope);
    expect(snapshot.rows.map((row) => row.score)).toEqual([95, 5, null]);
    expect(snapshot.rows[2]?.coverage.reason).toBe("no_data");
    expect(snapshot.sources).toHaveLength(3);
  });

  it("fingerprints the whole source set, independent of iteration order and unused metrics", async () => {
    const { results, contributions, rebuild } = await setup();
    const before = await rebuild.execute(performanceScope);
    results.rows.reverse();
    const rows = await contributions.listByCompetition(performanceScope.competitionId);
    await contributions.deleteByCompetition(performanceScope.competitionId);
    await contributions.saveMany(rows.reverse().map((row) => ({ ...row, saves: 999 })));
    const after = await rebuild.execute(performanceScope);
    expect(after.revisionFingerprint).toBe(before.revisionFingerprint);
    expect(after.rows).toEqual(before.rows);
  });

  it("voids old appearances, changes the fingerprint even with unchanged maximum revision", async () => {
    const { results, rebuild } = await setup();
    const before = await rebuild.execute(performanceScope);
    await results.save({ ...results.rows[0]!, status: "voided" });
    const after = await rebuild.execute(performanceScope);
    expect(after.revisionFingerprint).not.toBe(before.revisionFingerprint);
    expect(after.sources[0]?.status).toBe("voided");
    expect(after.rows[0]).toMatchObject({
      score: null,
      coverage: { encounters: 2, reason: "insufficient_sample" },
    });
  });

  it("corrections exclude old revisions and fail closed until contributions catch up", async () => {
    const { results, contributions, rebuild } = await setup();
    const before = await rebuild.execute(performanceScope);
    const corrected = performancePair(1, {
      id: "corrected-home",
      officialResultId: "corrected",
      revision: 2,
      goalsFor: 0,
      goalsAgainst: 2,
    });
    await results.save(officialPerformanceResult(corrected));
    const partial = await rebuild.execute(performanceScope);
    expect(partial.projectionComplete).toBe(false);
    expect(partial.rows.every((row) => row.score === null)).toBe(true);
    await contributions.saveMany(corrected);
    const after = await rebuild.execute(performanceScope);
    expect(after.projectionComplete).toBe(true);
    expect(after.revisionFingerprint).not.toBe(before.revisionFingerprint);
    expect(after.rows.find((row) => row.teamId === "team-a")?.evidence.resultPoints).toBe(6);
    expect(after.sources[0]?.revision).toBe(2);
  });

  it("rejects tenant mismatch before reading sources or replacing a snapshot", async () => {
    const { rebuild, rankings } = await setup();
    await expect(
      rebuild.execute({ ...performanceScope, organizationId: asOrganizationId("foreign") }),
    ).rejects.toMatchObject({ code: "statistics.team_performance_scope_invalid" });
    expect(await rankings.find(performanceScope)).toBeNull();
  });

  it("compare-and-set rejects stale replacements and memory reads cannot mutate stored rows", async () => {
    const { rankings, rebuild } = await setup();
    const first = await rebuild.execute(performanceScope);
    const next = { ...first, revisionFingerprint: "b".repeat(64) };
    expect(await rankings.replace(next, first.revisionFingerprint)).toBe(true);
    expect(await rankings.replace(first, first.revisionFingerprint)).toBe(false);
    const stored = await rankings.find(performanceScope);
    expect(stored?.revisionFingerprint).toBe(next.revisionFingerprint);
    stored?.updatedAt.setFullYear(1900);
    expect((await rankings.find(performanceScope))?.updatedAt.getFullYear()).toBe(2026);
  });

  it("checks statistics.read with the complete trusted scope before accessing storage", async () => {
    const { rankings, rebuild } = await setup();
    await rebuild.execute(performanceScope);
    const requests: string[] = [];
    const query = new GetTeamPerformanceRankingUseCase({
      rankings,
      authorization: {
        async decide(request) {
          requests.push(request.permission);
          expect(request.scope).toEqual(performanceScope);
          return {
            allowed: false,
            permission: request.permission,
            scope: request.scope,
            reason: "denied",
          };
        },
        async getEffectiveAccess() {
          throw new Error("unused");
        },
      },
    });
    await expect(
      query.execute({
        ...performanceScope,
        actorId: performanceCompetition().competition.createdByActorId,
      }),
    ).rejects.toMatchObject({ code: "statistics.read_forbidden" });
    expect(requests).toEqual([STATISTICS_PERMISSION.read]);
  });

  it("serializes two rebuilds and allows nested operations without deadlock", async () => {
    const { rebuild, lock } = await setup();
    const snapshots = await Promise.all(
      [1, 2, 3].map(() =>
        lock.runExclusive(performanceScope.competitionId, () => rebuild.execute(performanceScope)),
      ),
    );
    expect(snapshots.map((snapshot) => snapshot.revisionFingerprint)).toEqual(
      Array(3).fill(snapshots[0]?.revisionFingerprint),
    );
  });
});
