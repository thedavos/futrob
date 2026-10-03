import { AsyncLocalStorage } from "node:async_hooks";
import type { CompetitionId } from "@futrob/shared-kernel";
import type { TeamPerformanceRankingLockPort } from "@futrob/statistics";
import type { Pool } from "pg";
import { getPgExecutor, isInPgTransaction } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryTeamPerformanceRankingLock implements TeamPerformanceRankingLockPort {
  private readonly tails = new Map<CompetitionId, Promise<void>>();
  private readonly held = new AsyncLocalStorage<ReadonlySet<CompetitionId>>();

  async runExclusive<T>(competitionId: CompetitionId, operation: () => Promise<T>): Promise<T> {
    const held = this.held.getStore();
    if (held?.has(competitionId)) return operation();
    const previous = this.tails.get(competitionId) ?? Promise.resolve();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => hold);
    this.tails.set(competitionId, tail);
    await previous;
    try {
      return await this.held.run(new Set([...(held ?? []), competitionId]), operation);
    } finally {
      release();
      if (this.tails.get(competitionId) === tail) this.tails.delete(competitionId);
    }
  }
}

export class PostgresTeamPerformanceRankingLock implements TeamPerformanceRankingLockPort {
  constructor(private readonly pool: Pool) {}
  async runExclusive<T>(competitionId: CompetitionId, operation: () => Promise<T>): Promise<T> {
    if (!isInPgTransaction())
      throw new Error("Team performance exclusion requires a Postgres transaction.");
    await getPgExecutor(this.pool).query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `statistics:team-performance:${competitionId}`,
    ]);
    return operation();
  }
}
