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
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "**/openapi/*.yaml",
      ".agent/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".continue/**",
      ".cursor/**",
      ".gemini/**",
      ".opencode/**",
      ".pi/**",
      ".roo/**",
      ".windsurf/**",
      "tools/oxlint/anti-slop/**",
    ],
  },
  lint: {
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
      {
        name: "anti-slop",
        specifier: "./tools/oxlint/anti-slop/index.ts",
      },
    ],
    plugins: ["typescript"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "packages/api-contracts/scripts/**",
      ".agent/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".continue/**",
      ".cursor/**",
      ".gemini/**",
      ".opencode/**",
      ".pi/**",
      ".roo/**",
      ".windsurf/**",
      "tools/oxlint/anti-slop/**",
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-runtime-typeof": "error",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "error",
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
      "packages/api-contracts",
      "packages/sdk",
      "packages/shared-kernel",
      "packages/identity",
      "packages/game-data",
      "packages/organizations",
      "packages/competitions",
      "packages/results",
      "packages/scheduling",
      "packages/statistics",
      "packages/teams",
    ],
  },
});
