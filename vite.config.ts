import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "vite-plus/test/browser-playwright";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, defineProject } from "vite-plus";

const repoRoot = dirname(fileURLToPath(import.meta.url));

/** Storybook component tests (stories as tests) running in a real browser. */
function storybookVitestProject() {
  return defineProject({
    plugins: [
      storybookTest({
        configDir: resolve(repoRoot, ".storybook"),
        // Stories tagged "vitest-skip" are reported as skipped, not silently excluded.
        tags: { skip: ["vitest-skip"] },
      }),
    ],
    test: {
      name: "storybook",
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }],
      },
    },
  });
}

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
      "**/paraglide/**",
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
      {
        name: "futrob",
        specifier: "./tools/oxlint/futrob/index.ts",
      },
    ],
    plugins: ["typescript", "import"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "**/paraglide/**",
      // Size budget applies to production code only; test/story suites grow freely.
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.stories.tsx",
      // Generated / pure-data files — exempt from size limits permanently.
      "packages/api-contracts/scripts/**",
      "packages/api-contracts/src/v1/openapi/document.ts",
      "apps/web/src/shared/presentation/i18n/catalogs.ts",
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
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
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
      "typescript/switch-exhaustiveness-check": "error",
      "typescript/no-floating-promises": "error",
      "typescript/await-thenable": "error",
      "typescript/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "import/no-duplicates": "error",
      "typescript/no-restricted-types": [
        "error",
        {
          types: {
            any: "Use unknown and parse or match at boundaries instead of any.",
          },
        },
      ],
      "futrob/no-unparsed-json-boundary": "error",
      "futrob/no-cross-module-adapter-import": "error",
    },
    overrides: [
      {
        // The logger package is the sanctioned console sink for the whole repo.
        files: ["packages/logger/**"],
        plugins: ["typescript", "import"],
        rules: {
          "no-console": "off",
        },
      },
      {
        files: ["apps/web/**", "packages/ui/**"],
        plugins: ["typescript", "react", "jsx-a11y", "import"],
        rules: {
          "react/self-closing-comp": "error",
          "jsx-a11y/label-has-associated-control": [
            "error",
            { controlComponents: ["Switch", "Checkbox"] },
          ],
          "jsx-a11y/alt-text": "error",
          "react/button-has-type": "error",
          "jsx-a11y/no-autofocus": "error",
        },
      },
      {
        files: ["packages/*/src/domain/**", "packages/*/src/application/**"],
        plugins: ["typescript", "import"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              paths: [
                {
                  name: "react",
                  message: "Domain/application must not import React.",
                },
                {
                  name: "react-dom",
                  message: "Domain/application must not import React DOM.",
                },
                {
                  name: "zod",
                  message: "Domain/application must not import Zod — parse in adapters or server.",
                },
                {
                  name: "@tanstack/react-router",
                  message: "Domain/application must not import TanStack Router.",
                },
                {
                  name: "@tanstack/react-query",
                  message: "Domain/application must not import TanStack Query.",
                },
                {
                  name: "@sentry/react",
                  message: "Domain/application must not import Sentry React bindings.",
                },
                {
                  name: "@sentry/node",
                  message: "Domain/application must not import Sentry Node bindings.",
                },
              ],
              patterns: [
                {
                  group: ["**/apps/web/**", "**/apps/api/**"],
                  message: "BC packages must not import app-layer modules.",
                },
              ],
            },
          ],
          "futrob/prefer-tagged-error": "error",
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
        files: ["**/*.d.ts"],
        rules: {
          "typescript/consistent-type-imports": "off",
        },
      },
      {
        files: ["**/*.{test,spec}.{ts,tsx}"],
        plugins: ["typescript", "vitest", "import"],
        rules: {
          "@typescript-eslint/no-explicit-any": "off",
          "typescript/no-restricted-types": "off",
          "typescript/consistent-type-imports": [
            "error",
            {
              prefer: "type-imports",
              fixStyle: "separate-type-imports",
              disallowTypeAnnotations: false,
            },
          ],
          "vitest/no-disabled-tests": "error",
          "vitest/no-focused-tests": "error",
          "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "runCase"] }],
          "futrob/prefer-tagged-error": "off",
          "futrob/no-cross-module-adapter-import": "off",
        },
      },
    ],
  },
  test: {
    // Per-workspace Vite configs own aliases (e.g. apps/web `@/` → src).
    projects: [
      "apps/web",
      "apps/api",
      "apps/auth",
      "packages/api-contracts",
      "packages/sdk",
      "packages/shared-kernel",
      "packages/ui",
      "packages/ea-clubs",
      "packages/identity",
      "packages/game-data",
      "packages/organizations",
      "packages/competitions",
      "packages/results",
      "packages/scheduling",
      "packages/statistics",
      "packages/teams",
      // Storybook component tests (stories as tests) in a real browser.
      storybookVitestProject(),
      "tools/oxlint/futrob",
    ],
    coverage: {
      // Ratchet: floors just under the current baseline so coverage can only go up.
      thresholds: {
        statements: 72,
        branches: 65,
        functions: 69,
        lines: 74,
      },
    },
  },
});
