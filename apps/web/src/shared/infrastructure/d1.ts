/** Minimal D1 surface used by auth adapters (avoids depending on wrangler typegen). */
export interface AppD1Database {
  prepare(query: string): {
    bind(...values: unknown[]): unknown;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<unknown>;
    all<T = unknown>(): Promise<{ results: T[] }>;
  };
  batch<T = unknown>(statements: unknown[]): Promise<T[]>;
  exec(query: string): Promise<unknown>;
}
