import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

function getAbsolutePath(packageName: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${packageName}/package.json`)));
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [getAbsolutePath("@storybook/addon-docs"), getAbsolutePath("@storybook/addon-a11y")],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  async viteFinal(viteConfig) {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
