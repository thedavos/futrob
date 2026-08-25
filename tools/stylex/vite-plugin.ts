import stylex from "@stylexjs/unplugin";

/** Shared StyleX compiler for `apps/web` and Storybook. */
export function futrobStylex() {
  return stylex.vite({
    useCSSLayers: true,
    runtimeInjection: false,
    dev: process.env.NODE_ENV !== "production",
  });
}
