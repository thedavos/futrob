import type { TeamId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class TeamExternalClubMutationLock {
  private readonly tails = new Map<TeamId, Promise<void>>();

  constructor(private readonly pool: Pool | undefined) {}

  async runExclusive<T>(teamId: TeamId, operation: () => Promise<T>): Promise<T> {
    if (this.pool) {
      await getPgExecutor(this.pool).query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`teams:external-club:${teamId}`],
      );
      return operation();
    }
    const previous = this.tails.get(teamId) ?? Promise.resolve();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => hold);
    this.tails.set(teamId, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(teamId) === tail) this.tails.delete(teamId);
    }
  }
}
