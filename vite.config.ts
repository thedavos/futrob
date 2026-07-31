import { defineConfig } from "vite-plus";

/**
 * Root Vite+ config — monorepo quality tooling.
 * App runtime (TanStack Start / Cloudflare) lives in apps/web/vite.config.ts.
 * @see https://viteplus.dev/guide/monorepo
 */
export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    singleQuote: false,
    semi: true,
    ignorePatterns: ["**/routeTree.gen.ts", "packages/sdk_dart/**", "**/openapi/*.yaml"],
  },
  lint: {
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    plugins: ["typescript"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "packages/sdk_dart/**",
      "packages/api-contracts/scripts/**",
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
    overrides: [
      {
        files: ["apps/web/**", "packages/ui/**"],
        plugins: ["typescript", "react"],
        rules: {
          "react/self-closing-comp": "error",
        },
      },
      {
        // CLI is a Node playground — console output is intentional.
        files: ["apps/cli/**"],
        env: {
          node: true,
        },
        rules: {
          "no-console": "off",
        },
      },
      {
        // apps/api is a Node HTTP server — startup logging is intentional.
        files: ["apps/api/**"],
        env: {
          node: true,
        },
        rules: {
          "no-console": "off",
        },
      },
      {
        // OpenAPI generator is a Node CLI script — console output is intentional.
        files: ["packages/api-contracts/scripts/**"],
        env: {
          node: true,
        },
        rules: {
          "no-console": "off",
        },
      },
      {
        files: ["**/*.{test,spec}.{ts,tsx}"],
        plugins: ["typescript", "vitest"],
        rules: {
          "@typescript-eslint/no-explicit-any": "off",
          "vitest/no-disabled-tests": "error",
        },
      },
    ],
  },
  test: {
    // Per-workspace Vite configs own aliases (e.g. apps/web `@/` → src).
    projects: [
      "apps/web",
      "apps/api",
      "packages/sdk",
      "packages/shared-kernel",
      "packages/game-data",
      "packages/organizations",
      "packages/competitions",
      "packages/results",
    ],
  },
});
