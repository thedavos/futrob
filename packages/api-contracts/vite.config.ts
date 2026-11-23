import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    name: "api-contracts",
    // OpenAPI schema validation is CPU-intensive on the CI runner.
    sequence: { groupOrder: 1 },
    testTimeout: 180_000,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
