import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runtime/test config for @futrob/api.
 * Quality (fmt/lint/check, including anti-slop) is owned by the repo-root
 * vite.config.ts. `vp lint` from this package still uses that root config.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
    tsconfigPaths: true,
  },
  test: {
    name: "api",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
