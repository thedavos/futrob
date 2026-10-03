import { describe, expect, it } from "vite-plus/test";
import {
  hasRequiredAuthTables,
  isAuthSchemaReady,
  REQUIRED_AUTH_TABLES,
} from "./auth-readiness.ts";

describe("hasRequiredAuthTables", () => {
  it("accepts the complete auth schema", () => {
    expect(hasRequiredAuthTables(REQUIRED_AUTH_TABLES)).toBe(true);
  });

  it.each(REQUIRED_AUTH_TABLES)("rejects a schema without %s", (missingTable) => {
    const existing = REQUIRED_AUTH_TABLES.filter((tableName) => tableName !== missingTable);
    expect(hasRequiredAuthTables(existing)).toBe(false);
  });
});

describe("isAuthSchemaReady", () => {
  it("reads the tables of the current schema", async () => {
    const probe = {
      query: async () => ({ rows: REQUIRED_AUTH_TABLES.map((table_name) => ({ table_name })) }),
    };
    await expect(isAuthSchemaReady(probe)).resolves.toBe(true);
  });

  it("reports an incomplete schema", async () => {
    const probe = { query: async () => ({ rows: [{ table_name: "auth_users" }] }) };
    await expect(isAuthSchemaReady(probe)).resolves.toBe(false);
  });
});
