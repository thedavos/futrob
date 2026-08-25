import "./guard-unplugin-css.cjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import stylex from "@stylexjs/unplugin";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Shared StyleX compiler for `apps/web` and Storybook. */
export function futrobStylex() {
  return stylex.vite({
    useCSSLayers: true,
    runtimeInjection: false,
    dev: process.env.NODE_ENV !== "production",
    unstable_moduleResolution: {
      type: "commonJS",
      rootDir: repoRoot,
    },
  });
}
