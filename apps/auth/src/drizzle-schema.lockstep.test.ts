import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const here = dirname(fileURLToPath(import.meta.url));

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

describe("auth drizzle schema lockstep", () => {
  it("matches the web session-read schema", () => {
    const authSchema = readFileSync(resolve(here, "adapters/auth/drizzle-schema.ts"), "utf8");
    const webSchema = readFileSync(
      resolve(here, "../../web/src/modules/identity/adapters/auth/drizzle-schema.ts"),
      "utf8",
    );
    expect(stripComments(authSchema)).toBe(stripComments(webSchema));
  });
});
