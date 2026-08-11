import type { EncounterId, EncounterMutationLockPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryEncounterMutationLock implements EncounterMutationLockPort {
  private readonly tails = new Map<EncounterId, Promise<void>>();

  async runExclusive<T>(encounterId: EncounterId, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(encounterId) ?? Promise.resolve();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => hold);
    this.tails.set(encounterId, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(encounterId) === tail) this.tails.delete(encounterId);
    }
  }
}

export class PostgresEncounterMutationLock implements EncounterMutationLockPort {
  constructor(private readonly pool: Pool) {}

  async runExclusive<T>(encounterId: EncounterId, operation: () => Promise<T>): Promise<T> {
    await getPgExecutor(this.pool).query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
      `scheduling:encounter:${encounterId}`,
    ]);
    return operation();
  }
}
