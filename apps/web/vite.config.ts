import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isVitest = process.env.VITEST != null;

async function createAppPlugins() {
  if (isVitest) {
    return [viteReact()];
  }

  const [{ cloudflare }, { tanstackStart }] = await Promise.all([
    import("@cloudflare/vite-plugin"),
    import("@tanstack/react-start/plugin/vite"),
  ]);

  return [
    devtools(),
    !isVitest && cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    // React plugin must come after tanstackStart.
    viteReact(),
  ];
}

/**
 * App Vite config for @futrob/web.
 * Runtime: TanStack Start + Cloudflare Workers.
 * Quality (fmt/lint/check) is owned by the repo-root vite.config.ts (oxfmt/oxlint via Vite+).
 */
export default defineConfig({
  root: rootDir,
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["src/routeTree.gen.ts", "src/paraglide/**"],
  },
  lint: {
    ignorePatterns: ["src/routeTree.gen.ts", "src/paraglide/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  build: {
    // The gzip budget is enforced against dist/client by `npm run bundle:budget`.
    // Keep this raw-size warning above the current framework entry to avoid a second,
    // incomparable budget based on uncompressed bytes.
    chunkSizeWarningLimit: 860,
    manifest: true,
  },
  plugins: [tailwindcss(), createAppPlugins()],
  test: {
    name: "web",
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Pyramid focus: domain + application (+ in-memory fakes used by use cases).
      // Routes, DI, workers, React UI, and generated files stay out of the gate.
      include: [
        "src/shared/domain/**/*.ts",
        "src/shared/application/**/*.ts",
        "src/modules/**/domain/**/*.ts",
        "src/modules/**/application/**/*.ts",
        "src/modules/**/adapters/registry/**/*.ts",
        "../../packages/*/src/domain/**/*.ts",
        "../../packages/*/src/application/**/*.ts",
      ],
      exclude: ["**/*.{test,spec}.{ts,tsx}", "**/domain/ports/**", "**/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
