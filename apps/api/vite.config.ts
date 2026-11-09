import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runtime/test config for @futrob/api.
 * Quality (fmt/lint/check, including anti-slop) is owned by the repo-root
 * vite.config.ts. `vp lint` from this package still uses that root config.
 *
 * `setupFiles` extends Zod with `.openapi()` before test modules build
 * schemas, matching the first import in `src/main.ts`.
 *
 * Postgres integration suites (`TEST_DATABASE_URL`) apply the full migration
 * history into isolated schemas; under coverage and parallel files a single
 * test or hook can outlast the Vitest defaults, so the limits live here
 * instead of per test (enforced by `futrob/no-test-timeout`).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
    dedupe: ["zod"],
    tsconfigPaths: true,
  },
  test: {
    name: "api",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts", "scripts/**/*.{test,spec}.ts"],
    setupFiles: ["./src/http/openapi/zod-openapi-setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
