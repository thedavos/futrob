import type { TransactionPort } from "@futrob/shared-kernel";
import type { RosterMutationPort, RosterMutationScope } from "@futrob/teams";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

function scopeKey(scope: RosterMutationScope): string {
  return `${scope.organizationId}:${scope.competitionId}`;
}

export class InMemoryRosterMutationPort implements RosterMutationPort {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(scope: RosterMutationScope, operation: () => Promise<T>): Promise<T> {
    const key = scopeKey(scope);
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}

export class PostgresRosterMutationPort implements RosterMutationPort {
  constructor(
    private readonly pool: Pool,
    private readonly transaction: TransactionPort,
  ) {}

  runExclusive<T>(scope: RosterMutationScope, operation: () => Promise<T>): Promise<T> {
    return this.transaction.runInTransaction(async () => {
      await getPgExecutor(this.pool).query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [scopeKey(scope)],
      );
      return operation();
    });
  }
}
