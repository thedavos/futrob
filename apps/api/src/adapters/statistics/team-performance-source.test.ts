import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { OfficialResult } from "@futrob/results";
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
  buildTeamPerformanceRanking,
  type TeamMatchContribution,
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
    await results.append(officialPerformanceResult(pair));
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

async function readSources(results: OfficialResult[], stored: TeamMatchContribution[]) {
  const context = await setup();
  context.results.rows.splice(0, context.results.rows.length, ...results);
  context.contributions.listByCompetition = async () => stored;
  return context.sources.read(performanceScope);
}

describe("official team performance source matching", () => {
  it.each([10, 20, 40])("bounds matching work for %s two-slot results", async (size) => {
    const pairs = Array.from({ length: size }, (_, i) => [
      ...performancePair(i + 1, { occurredAt: new Date("2026-08-01T19:00:00Z") }),
      ...performancePair(i + 1, {
        id: `second-${i}`,
        officialSlot: 2,
        occurredAt: new Date("2026-08-02T19:00:00Z"),
      }),
    ]);
    let reads = 0;
    const rows = pairs.flat().map((row) => ({
      ...row,
      get officialResultId() {
        reads++;
        return row.officialResultId;
      },
    }));
    const output = await readSources(pairs.map(officialPerformanceResult), rows);
    expect(output.projectionComplete).toBe(true);
    expect(output.contributions).toHaveLength(rows.length);
    expect(reads).toBeLessThanOrEqual(4 * rows.length);
  });

  it("preserves canonical sources and the fingerprint for shuffled revisions, slots and voids", async () => {
    const original = performancePair(1);
    const corrected = performancePair(1, {
      id: "corrected",
      officialResultId: "revision-2",
      revision: 2,
    });
    const secondSlot = performancePair(1, {
      id: "second",
      officialResultId: "revision-2",
      revision: 2,
      officialSlot: 2,
    });
    const voided = performancePair(2);
    const unmatched = performancePair(3, { teamId: null, correlationStatus: "unmatched" });
    const current = [...corrected, ...secondSlot, ...unmatched];
    const results = [
      officialPerformanceResult(original),
      officialPerformanceResult([...corrected, ...secondSlot]),
      { ...officialPerformanceResult(voided), status: "voided" as const },
      officialPerformanceResult(unmatched),
    ];
    const stored = [...original, ...current, ...voided];
    const before = await readSources(results, stored);
    expect(before).toEqual({
      ...performanceScope,
      teamIds: ["team-a", "team-b", "team-c"].map(asTeamId),
      contributions: [...current].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      revisions: [
        {
          officialResultId: "revision-2",
          encounterId: "encounter-1",
          revision: 2,
          status: "approved",
        },
        { officialResultId: "result-2", encounterId: "encounter-2", revision: 1, status: "voided" },
        {
          officialResultId: "result-3",
          encounterId: "encounter-3",
          revision: 1,
          status: "approved",
        },
      ],
      revisionFingerprint: before.revisionFingerprint,
      projectionComplete: true,
      unmatchedContributions: 2,
    });
    expect(before.revisionFingerprint).toMatchInlineSnapshot(
      `"2d47bd627d3463613fa03bb08e5a358933ecce24dd118a00c007bf0fc48fb1ae"`,
    );
    const after = await readSources(
      [results[3]!, results[1]!, results[0]!, results[2]!],
      [...stored].sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0)),
    );
    expect(after).toEqual(before);
    const now = new Date("2026-09-01T00:00:00Z");
    expect(buildTeamPerformanceRanking(after, now)).toEqual(
      buildTeamPerformanceRanking(before, now),
    );
  });

  it("keeps compound identities distinct when IDs contain separators and JSON characters", async () => {
    const pairs = [
      performancePair(1, { officialResultId: "r|1|1", encounterId: asEncounterId("e") }),
      performancePair(2, { officialResultId: "r", encounterId: asEncounterId("1|1|e") }),
      performancePair(3, { officialResultId: 'r["\\\u0000', encounterId: asEncounterId('e,\"\\') }),
    ];
    const output = await readSources(pairs.map(officialPerformanceResult), pairs.flat().reverse());
    expect(output.projectionComplete).toBe(true);
    expect(output.contributions).toEqual(pairs.flat());
  });

  it.each([
    { name: "missing away", change: (rows: TeamMatchContribution[]) => rows.slice(0, 1) },
    { name: "duplicate row", change: (rows: TeamMatchContribution[]) => [...rows, rows[0]!] },
    {
      name: "two home sides",
      change: (rows: TeamMatchContribution[]) =>
        rows.map((row) => ({ ...row, side: "home" as const })),
    },
    {
      name: "two away sides",
      change: (rows: TeamMatchContribution[]) =>
        rows.map((row) => ({ ...row, side: "away" as const })),
    },
    {
      name: "wrong result",
      change: (rows: TeamMatchContribution[]) =>
        rows.map((row) => ({ ...row, officialResultId: "other" })),
    },
    {
      name: "wrong revision",
      change: (rows: TeamMatchContribution[]) => rows.map((row) => ({ ...row, revision: 2 })),
    },
    {
      name: "wrong slot",
      change: (rows: TeamMatchContribution[]) =>
        rows.map((row) => ({ ...row, officialSlot: 2 as const })),
    },
    {
      name: "wrong encounter",
      change: (rows: TeamMatchContribution[]) =>
        rows.map((row) => ({ ...row, encounterId: asEncounterId("other") })),
    },
    {
      name: "foreign organization",
      change: (rows: TeamMatchContribution[]) =>
        rows.map((row) => ({ ...row, organizationId: asOrganizationId("other") })),
    },
    {
      name: "foreign competition",
      change: (rows: TeamMatchContribution[]) =>
        rows.map((row) => ({ ...row, competitionId: asCompetitionId("other") })),
    },
    {
      name: "wrong scoreboard",
      change: (rows: TeamMatchContribution[]) => rows.map((row) => ({ ...row, goalsFor: 99 })),
    },
  ])("fails closed for $name", async ({ change }) => {
    const pair = performancePair(1);
    const output = await readSources([officialPerformanceResult(pair)], change(pair));
    expect(output.projectionComplete).toBe(false);
    expect(output.contributions).toEqual([]);
    expect(
      buildTeamPerformanceRanking(output, new Date("2026-09-01T00:00:00Z")).rows.every(
        (row) => row.score === null && row.coverage.reason === "projection_incomplete",
      ),
    ).toBe(true);
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid official goals %s even when projected goals agree",
    async (goals) => {
      const pair = performancePair(1, { goalsFor: goals });
      const output = await readSources([officialPerformanceResult(pair)], pair);
      expect(output.projectionComplete).toBe(false);
      expect(output.contributions).toEqual([]);
    },
  );

  it("rejects invalid official timestamps and uses official time over projected time", async () => {
    const pair = performancePair(1);
    const result = officialPerformanceResult(pair);
    const valid = await readSources(
      [result],
      pair.map((row) => ({ ...row, occurredAt: new Date(0) })),
    );
    expect(valid.contributions).toEqual(pair);
    const invalid = await readSources(
      [
        {
          ...result,
          slots: result.slots.map((slot) => ({ ...slot, occurredAt: new Date(Number.NaN) })),
        },
      ],
      pair,
    );
    expect(invalid.projectionComplete).toBe(false);
    expect(invalid.contributions).toEqual([]);
  });

  it("does not match a NaN revision or confuse opposite infinite revisions", async () => {
    const nonComparable = performancePair(1, { revision: Number.NaN });
    const nan = await readSources([officialPerformanceResult(nonComparable)], nonComparable);
    expect(nan.projectionComplete).toBe(false);
    expect(nan.contributions).toEqual([]);
    const positive = performancePair(1, { revision: Number.POSITIVE_INFINITY });
    const negative = positive.map((row) => ({ ...row, revision: Number.NEGATIVE_INFINITY }));
    const infinity = await readSources([officialPerformanceResult(positive)], negative);
    expect(infinity.projectionComplete).toBe(false);
    expect(infinity.contributions).toEqual([]);
  });

  it("keeps the valid side as evidence while refusing scores for an inconsistent pair", async () => {
    const pair = performancePair(1);
    const output = await readSources(
      [officialPerformanceResult(pair)],
      pair.map((row) => (row.side === "home" ? { ...row, goalsAgainst: 99 } : row)),
    );
    expect(output.projectionComplete).toBe(false);
    expect(output.contributions).toEqual(pair.filter((row) => row.side === "away"));
    expect(
      buildTeamPerformanceRanking(output, new Date("2026-09-01T00:00:00Z")).rows.every(
        (row) => row.score === null,
      ),
    ).toBe(true);
  });
});

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
    await results.markVoided(results.rows[0]!.id);
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
    await results.markVoided("result-1");
    await results.append(officialPerformanceResult(corrected));
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
      planAccess: { includesPerformanceRanking: async () => true },
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
