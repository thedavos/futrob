import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

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
