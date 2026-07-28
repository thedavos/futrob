import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, "..");
const webSrc = resolve(repoRoot, "apps/web/src");

function getAbsolutePath(packageName: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${packageName}/package.json`)));
}

const config: StorybookConfig = {
  stories: ["../packages/ui/src/**/*.stories.@(ts|tsx)", "../apps/web/src/**/*.stories.@(ts|tsx)"],
  addons: [getAbsolutePath("@storybook/addon-docs"), getAbsolutePath("@storybook/addon-a11y")],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  async viteFinal(viteConfig) {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: [
        {
          find: "@/modules/identity/adapters/auth/auth-client.ts",
          replacement: resolve(configDir, "mocks/auth-client.ts"),
        },
        {
          find: "@/modules/organizations/presentation/organizations-browser-client.ts",
          replacement: resolve(configDir, "mocks/organizations-browser-client.ts"),
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
