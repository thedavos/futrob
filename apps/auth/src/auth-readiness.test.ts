import { describe, expect, it } from "vite-plus/test";
import { hasRequiredAuthTables, REQUIRED_AUTH_TABLES } from "./auth-readiness.ts";

describe("hasRequiredAuthTables", () => {
  it("accepts the complete auth schema", () => {
    expect(hasRequiredAuthTables(REQUIRED_AUTH_TABLES)).toBe(true);
  });

  it.each(REQUIRED_AUTH_TABLES)("rejects a schema without %s", (missingTable) => {
    const existing = REQUIRED_AUTH_TABLES.filter((tableName) => tableName !== missingTable);
    expect(hasRequiredAuthTables(existing)).toBe(false);
  });
});
