import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runtime/test config for @futrob/auth.
 * Quality (fmt/lint/check) is owned by the repo-root vite.config.ts.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
    tsconfigPaths: true,
  },
  test: {
    name: "auth",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
