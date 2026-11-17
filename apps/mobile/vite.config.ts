import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
    // RN libraries publish CommonJS `main` builds that would bypass the react-native alias.
    mainFields: ["module", "main"],
    extensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".mjs", ".js", ".json"],
  },
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    name: "mobile",
    // Screen tests render React Native primitives through react-native-web into jsdom.
    environment: "jsdom",
    // Multi-step screen flows (e.g. the Match Center proposal) drive many user events through
    // react-native-web; on shared CI runners they can pass the 5s default.
    testTimeout: 20_000,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    alias: {
      "expo-secure-store": path.resolve(rootDir, "test/expo-secure-store.ts"),
      "expo-crypto": path.resolve(rootDir, "test/expo-crypto.ts"),
      // Before "expo-router": aliases match by prefix and the first match wins.
      "expo-router/ui": path.resolve(rootDir, "test/expo-router-ui.tsx"),
      "expo-router": path.resolve(rootDir, "test/expo-router.tsx"),
      "@sentry/react-native": path.resolve(rootDir, "test/sentry.ts"),
      "react-native": "react-native-web",
    },
    server: {
      deps: {
        // Transform RN libraries so their `react-native` imports resolve to react-native-web.
        inline: ["react-native-safe-area-context", "react-native-svg"],
      },
    },
  },
});
