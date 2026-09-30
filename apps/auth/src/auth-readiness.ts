export const REQUIRED_AUTH_TABLES = [
  "auth_users",
  "auth_sessions",
  "auth_accounts",
  "auth_verifications",
  "auth_rate_limits",
  "actors",
  "identity_subjects",
] as const;

export function hasRequiredAuthTables(tableNames: readonly string[]): boolean {
  const existing = new Set(tableNames);
  return REQUIRED_AUTH_TABLES.every((tableName) => existing.has(tableName));
}

export interface AuthSchemaProbe {
  query(text: string): Promise<{ rows: { table_name: string }[] }>;
}

export async function isAuthSchemaReady(probe: AuthSchemaProbe): Promise<boolean> {
  const result = await probe.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()",
  );
  return hasRequiredAuthTables(result.rows.map(({ table_name }) => table_name));
}
