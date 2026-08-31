import path from "node:path";
import { fileURLToPath } from "node:url";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { futrobStylex } from "../../tools/stylex/vite-plugin.ts";

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
    !isVitest &&
      cloudflare({
        viteEnvironment: { name: "ssr" },
        // Keep this off Node's 9229–9232 range so parallel `wrangler dev`
        // (apps/auth) and other local inspectors do not race the same port.
        inspectorPort: 13000,
      }),
    tanstackStart(),
    // React plugin must come after tanstackStart.
    viteReact(),
  ];
}

/**
 * App Vite config for @futrob/web.
 * Runtime: TanStack Start + Cloudflare Workers.
 * Quality (fmt/lint/check, including anti-slop) is owned by the repo-root
 * vite.config.ts. `vp lint` from this package still uses that root config.
 */
export default defineConfig({
  root: rootDir,
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["src/routeTree.gen.ts", "src/paraglide/**"],
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
    rolldownOptions: {
      output: {
        // Keep shared vendors out of `src-*.js` so the lazy/shared gzip budget
        // stays a per-file cap instead of a growing dump.
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /[/\\]node_modules[/\\](?:react|react-dom|scheduler)(?:[/\\]|$)/,
            },
            { name: "zod", test: /[/\\]node_modules[/\\]zod(?:[/\\]|$)/ },
            { name: "base-ui", test: /[/\\]node_modules[/\\]@base-ui[/\\]/ },
          ],
        },
      },
    },
  },
  plugins: [futrobStylex(), createAppPlugins()],
  test: {
    name: "web",
    environment: "node",
    setupFiles: ["src/test-setup.ts"],
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
