import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { RAW_COLOR_TOKENS, ROOT_TOKENS } from "./index.ts";
import { DARK_THEME } from "./theme-dark.ts";
import { LIGHT_THEME } from "./theme-light.ts";
import { MOTION_TOKENS, LAYERING_TOKENS } from "./motion.ts";
import { GEOMETRY_TOKENS } from "./geometry.ts";
import { TYPOGRAPHY_TOKENS } from "./typography.ts";
import { toCssValue, type TokenMap } from "./token.ts";

const TOKENS_CSS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../ui/src/tokens.css",
);

interface ParsedBlock {
  readonly selector: string;
  readonly declarations: ReadonlyMap<string, string>;
}

/**
 * Parses top-level `:root` and `.dark/[data-theme="dark"]` blocks. The
 * `prefers-reduced-motion` override is intentionally excluded (behavioral,
 * not part of the shared token contract).
 */
function parseTokensCss(css: string): ParsedBlock[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: ParsedBlock[] = [];
  let cursor = 0;

  while (cursor < withoutComments.length) {
    const openIndex = withoutComments.indexOf("{", cursor);
    if (openIndex === -1) {
      break;
    }

    const selector = normalize(withoutComments.slice(cursor, openIndex));
    const closeIndex = matchClosingBrace(withoutComments, openIndex);
    if (closeIndex === -1) {
      break;
    }

    if (!withoutComments.slice(cursor, openIndex).includes("@")) {
      blocks.push({
        selector,
        declarations: parseDeclarations(withoutComments.slice(openIndex + 1, closeIndex)),
      });
    }
    cursor = closeIndex + 1;
  }

  return blocks;
}

function matchClosingBrace(source: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function parseDeclarations(body: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of body.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const name = normalize(declaration.slice(0, separator));
    const value = normalize(declaration.slice(separator + 1));
    if (name.startsWith("--") && value.length > 0) {
      declarations.set(name.slice(2), value);
    }
  }
  return declarations;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function renderMap(map: TokenMap): Map<string, string> {
  return new Map(Object.entries(map).map(([name, value]) => [name, toCssValue(value)]));
}

describe("tokens.css parity with @futrob/ui-tokens", () => {
  const blocks = parseTokensCss(readFileSync(TOKENS_CSS_PATH, "utf8"));

  function blockBySelector(fragment: string): ParsedBlock {
    const block = blocks.find((candidate) => candidate.selector.includes(fragment));
    if (block === undefined) {
      throw new Error(`Block matching "${fragment}" not found in tokens.css`);
    }
    return block;
  }

  it("keeps :root declarations in sync", () => {
    const root = blockBySelector(":root");
    const expected = renderMap({
      ...RAW_COLOR_TOKENS,
      ...TYPOGRAPHY_TOKENS,
      ...GEOMETRY_TOKENS,
      ...MOTION_TOKENS,
      ...LAYERING_TOKENS,
      ...LIGHT_THEME,
    });

    expect(root.declarations.size).toBe(expected.size);
    for (const [name, value] of expected) {
      expect(root.declarations.get(name), `--${name}`).toBe(value);
    }
  });

  it("keeps dark theme declarations in sync", () => {
    const dark = blockBySelector('data-theme="dark"');
    const expected = renderMap(DARK_THEME);

    expect(dark.declarations.size).toBe(expected.size);
    for (const [name, value] of expected) {
      expect(dark.declarations.get(name), `--${name} (dark)`).toBe(value);
    }
  });
});
