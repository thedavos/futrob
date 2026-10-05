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
    name: "mobile",
    // Screen tests render React Native primitives through react-native-web into jsdom.
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    alias: {
      "expo-secure-store": path.resolve(rootDir, "test/expo-secure-store.ts"),
      "expo-crypto": path.resolve(rootDir, "test/expo-crypto.ts"),
      "expo-router": path.resolve(rootDir, "test/expo-router.tsx"),
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
