import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const here = dirname(fileURLToPath(import.meta.url));
const authMigrations = resolve(here, "../migrations");
const webMigrations = resolve(here, "../../web/migrations");

function sqlNames(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

describe("shared D1 migration ownership", () => {
  it("keeps one globally ordered history under apps/auth", () => {
    const names = sqlNames(authMigrations);
    const prefixes = names.map((name) => name.split("_", 1)[0]);

    expect(names).toEqual([
      "0001_better_auth_and_actors.sql",
      "0002_bff_rate_limit.sql",
      "0003_better_auth_rate_limit.sql",
      "0004_better_auth_account_issuer.sql",
    ]);
    expect(new Set(prefixes).size).toBe(names.length);
    expect(sqlNames(webMigrations)).toEqual([]);
  });

  it("points the web binding at the canonical migration directory", () => {
    const webWrangler = readFileSync(resolve(here, "../../web/wrangler.jsonc"), "utf8");
    expect(webWrangler).toContain('"migrations_dir": "../auth/migrations"');
  });
});
