import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    name: "mobile",
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    alias: {
      "expo-secure-store": path.resolve(rootDir, "test/expo-secure-store.ts"),
    },
  },
});
