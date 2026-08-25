/**
 * Persist the StyleX unplugin LightningCSS guard across `npm ci`.
 * Vite can collect CSS before `defineConsts` resolve; LightningCSS then
 * throws "Invalid empty selector" on `var(--hash){…}` rules.
 * @see https://github.com/facebook/stylex/issues/1497
 */
"use strict";

const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const MARKER = "futrobStylexLightningcssGuard";
const corePath = join(process.cwd(), "node_modules/@stylexjs/unplugin/lib/es/core.mjs");
if (!existsSync(corePath)) {
  return;
}
const source = readFileSync(corePath, "utf8");

if (source.includes(MARKER)) {
  return;
}

const from = `  const {
    code
  } = lightningTransform({
    targets: browserslistToTargets(browserslist()),
    ...options.lightningcssOptions,
    filename: 'stylex.css',
    code: Buffer.from(collectedCSS)
  });
  return code.toString();`;

const to = `  try {
    const {
      code
    } = lightningTransform({
      targets: browserslistToTargets(browserslist()),
      ...options.lightningcssOptions,
      filename: 'stylex.css',
      code: Buffer.from(collectedCSS)
    });
    return code.toString();
  } catch (error) {
    /* ${MARKER} */
    return collectedCSS;
  }`;

if (!source.includes(from)) {
  return;
}

writeFileSync(corePath, source.replace(from, to));
