import { err, type Result, type TransactionPort } from "@futrob/shared-kernel";

/** The command failure thrown out of the transaction so that it rolls back. */
interface RolledBackFailure<E> {
  failure?: E;
}

/**
 * Runs a command and its activity in one transaction that rolls back when the command
 * returns an error. A nested `runInTransaction` reuses the outer transaction, so a use case
 * that throws to undo its own writes would otherwise be committed by this outer one.
 */
export async function runAtomically<V, E>(
  transaction: TransactionPort,
  run: () => Promise<Result<V, E>>,
): Promise<Result<V, E>> {
  const rollback: RolledBackFailure<E> = {};
  try {
    return await transaction.runInTransaction(async () => {
      const result = await run();
      if (result.isErr()) {
        rollback.failure = result.error;
        throw result.error;
      }
      return result;
    });
  } catch (error) {
    if (rollback.failure !== undefined && error === rollback.failure) return err(rollback.failure);
    throw error;
  }
}
