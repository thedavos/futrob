/**
 * Cross-context unit-of-work boundary.
 *
 * Concrete adapters decide how the callback participates in a transaction.
 */
export interface TransactionPort {
  runInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}
