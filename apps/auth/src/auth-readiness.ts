export const REQUIRED_AUTH_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "actors",
  "identity_subjects",
  "rateLimit",
] as const;

export function hasRequiredAuthTables(tableNames: readonly string[]): boolean {
  const existing = new Set(tableNames);
  return REQUIRED_AUTH_TABLES.every((tableName) => existing.has(tableName));
}

export async function isAuthSchemaReady(database: D1Database): Promise<boolean> {
  const result = await database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all<{ name: string }>();
  return hasRequiredAuthTables(result.results.map(({ name }) => name));
}
