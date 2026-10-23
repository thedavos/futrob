import "./guard-unplugin-css.cjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import stylex from "@stylexjs/unplugin";
import type { Plugin } from "vite-plus";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * In watch mode the unplugin (0.19) resolves and `this.load`s every import of each
 * StyleX module, one by one, to read a `meta.stylex` that its own transform never
 * sets. In Vite dev that serializes the whole import graph before a module is
 * served. Reporting `watchMode: false` to that hook skips the no-op crawl; rules
 * are still collected from each module's own transform.
 */
function withoutWatchModeImportCrawl(plugin: Plugin): Plugin {
  const { transform } = plugin;
  if (transform === undefined || "handler" in transform) return plugin;
  return {
    ...plugin,
    transform(code, id, options) {
      const context: typeof this = Object.create(this, {
        meta: { value: { ...this.meta, watchMode: false } },
      });
      return transform.call(context, code, id, options);
    },
  };
}

export function futrobStylex(): Plugin {
  return withoutWatchModeImportCrawl(
    stylex.vite({
      useCSSLayers: { before: ["reset"] },
      runtimeInjection: false,
      dev: process.env.NODE_ENV !== "production",
      unstable_moduleResolution: {
        type: "commonJS",
        rootDir: repoRoot,
      },
    }),
  );
}
