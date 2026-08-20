/** Minimal D1 surface used by auth adapters (avoids depending on wrangler typegen). */
export type D1RunResult = Readonly<{
  success: boolean;
  meta?: Readonly<Record<string, string | number | null>>;
}>;

export type D1BatchResult = Readonly<{
  results: readonly unknown[];
}>;

export interface AppD1PreparedStatement {
  bind(...values: readonly D1BindValue[]): AppD1PreparedStatement;
  first<T>(colName?: string): Promise<T | null>;
  run(): Promise<D1RunResult>;
  all<T>(): Promise<{ results: T[] }>;
}

export type D1BindValue = string | number | boolean | null | ArrayBuffer;

export interface AppD1Database {
  prepare(query: string): AppD1PreparedStatement;
  batch(statements: readonly AppD1PreparedStatement[]): Promise<D1BatchResult[]>;
  exec(query: string): Promise<D1RunResult>;
}
