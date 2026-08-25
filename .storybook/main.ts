import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { futrobStylex } from "../tools/stylex/vite-plugin.ts";

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, "..");
const webSrc = resolve(repoRoot, "apps/web/src");

function getAbsolutePath(packageName: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${packageName}/package.json`)));
}

const config: StorybookConfig = {
  stories: ["../packages/ui/src/**/*.stories.@(ts|tsx)", "../apps/web/src/**/*.stories.@(ts|tsx)"],
  addons: [
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-vitest"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  async viteFinal(viteConfig) {
    const statisticsStoryClient = resolve(
      webSrc,
      "modules/statistics/presentation/player-matches-story-client.ts",
    );
    viteConfig.plugins = [
      {
        name: "storybook-mock-statistics-browser-client",
        enforce: "pre",
        resolveId(source: string) {
          const id = source.replaceAll("\\", "/").split("?")[0] ?? source;
          if (id.includes("player-matches-story-client")) return null;
          if (
            id === "./statistics-browser-client.ts" ||
            id === "./statistics-browser-client" ||
            id.endsWith("/statistics-browser-client.ts") ||
            id.endsWith("/statistics-browser-client")
          ) {
            return statisticsStoryClient;
          }
          return null;
        },
      },
      futrobStylex(),
      ...(viteConfig.plugins ?? []),
    ];
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: [
        // Match with or without `.ts` — Vite may strip the extension before alias lookup.
        {
          find: /^@\/modules\/identity\/(?:adapters\/auth\/)?auth-client(?:\.ts)?$/,
          replacement: resolve(configDir, "mocks/auth-client.ts"),
        },
        {
          find: /^@\/modules\/organizations\/presentation\/organizations-browser-client(?:\.ts)?$/,
          replacement: resolve(configDir, "mocks/organizations-browser-client.ts"),
        },
        {
          find: /^@\/modules\/statistics\/presentation\/statistics-browser-client(?:\.ts)?$/,
          replacement: statisticsStoryClient,
        },
        {
          find: "@",
          replacement: webSrc,
        },
        ...(Array.isArray(viteConfig.resolve?.alias)
          ? viteConfig.resolve.alias
          : Object.entries(viteConfig.resolve?.alias ?? {}).map(([find, replacement]) => ({
              find,
              replacement: String(replacement),
            }))),
      ],
      dedupe: [...new Set([...(viteConfig.resolve?.dedupe ?? []), "react", "react-dom"])],
    };
    return viteConfig;
  },
};

export default config;
