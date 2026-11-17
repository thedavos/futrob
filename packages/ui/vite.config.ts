import { defineConfig } from "vite-plus";

import { futrobStylex } from "../../tools/stylex/vite-plugin.ts";

export default defineConfig({
  plugins: [futrobStylex()],
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    name: "ui",
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
