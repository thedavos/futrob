import { GEOMETRY_TOKENS } from "./geometry.ts";
import { oklchToHex, type Oklch } from "./oklch.ts";
import { LAYERING_TOKENS, MOTION_TOKENS } from "./motion.ts";
import {
  BRAND_SCALE,
  AMBER_SCALE,
  BLUE_SCALE,
  NEUTRAL_SCALE,
  RED_SCALE,
  VIOLET_SCALE,
} from "./scales.ts";
import { LIGHT_THEME } from "./theme-light.ts";
import { oklchToken, type TokenMap, type TokenValue } from "./token.ts";
import { TYPOGRAPHY_TOKENS } from "./typography.ts";

export { formatOklch, oklch, oklchToHex, type Oklch } from "./oklch.ts";
export {
  fallbackRef,
  raw,
  ref,
  oklchToken,
  toCssDeclaration,
  toCssValue,
  type TokenMap,
  type TokenValue,
} from "./token.ts";
export {
  AMBER_SCALE,
  BLUE_SCALE,
  BRAND_SCALE,
  NEUTRAL_SCALE,
  RED_SCALE,
  VIOLET_SCALE,
} from "./scales.ts";
export { TYPOGRAPHY_TOKENS, type TypoRole } from "./typography.ts";
export { CORNER_TOKENS, CONTROL_TOKENS, GEOMETRY_TOKENS, SPACING_TOKENS } from "./geometry.ts";
export { LAYERING_TOKENS, MOTION_TOKENS } from "./motion.ts";
export { LIGHT_THEME } from "./theme-light.ts";
export { DARK_THEME } from "./theme-dark.ts";

/** Raw palette flattened as `brand-500`-style names, mirroring the `:root` declarations. */
export const RAW_COLOR_TOKENS: TokenMap = {
  ...Object.fromEntries(
    Object.entries(BRAND_SCALE).map(([stop, color]) => [`brand-${stop}`, oklchToken(color)]),
  ),
  ...Object.fromEntries(
    Object.entries(NEUTRAL_SCALE).map(([stop, color]) => [`neutral-${stop}`, oklchToken(color)]),
  ),
  ...Object.fromEntries(
    Object.entries(RED_SCALE).map(([stop, color]) => [`red-${stop}`, oklchToken(color)]),
  ),
  ...Object.fromEntries(
    Object.entries(AMBER_SCALE).map(([stop, color]) => [`amber-${stop}`, oklchToken(color)]),
  ),
  ...Object.fromEntries(
    Object.entries(BLUE_SCALE).map(([stop, color]) => [`blue-${stop}`, oklchToken(color)]),
  ),
  ...Object.fromEntries(
    Object.entries(VIOLET_SCALE).map(([stop, color]) => [`violet-${stop}`, oklchToken(color)]),
  ),
};

/** All `:root` declarations (raw scales + groups), order-insensitive parity is tested. */
export const ROOT_TOKENS: TokenMap = {
  ...RAW_COLOR_TOKENS,
  ...TYPOGRAPHY_TOKENS,
  ...GEOMETRY_TOKENS,
  ...MOTION_TOKENS,
  ...LAYERING_TOKENS,
  ...LIGHT_THEME,
};

/**
 * Resolves a semantic token name to a concrete Oklch color by walking
 * `var()` references. Raw scales are theme-independent (declared once in
 * `:root`), so they are always available as a fallback scope.
 * Returns null for non-color tokens.
 */
export function resolveThemeColor(
  name: string,
  theme: TokenMap = LIGHT_THEME,
  depth = 0,
): Oklch | null {
  if (depth > 16) {
    return null;
  }

  const token: TokenValue | undefined = theme[name] ?? RAW_COLOR_TOKENS[name];
  if (token === undefined) {
    return null;
  }

  switch (token.kind) {
    case "oklch":
      return token.color;
    case "ref":
      return resolveThemeColor(token.name, theme, depth + 1);
    case "fallbackRef": {
      const primary = resolveThemeColor(token.name, theme, depth + 1);
      return primary ?? resolveThemeColor(token.fallbackName, theme, depth + 1);
    }
    case "raw":
      return null;
  }
}

/**
 * Resolves every color-bearing token of a theme to sRGB hex values for
 * platforms that cannot parse `oklch()` or `var()` (React Native).
 */
export function themeToHexColors(theme: TokenMap = LIGHT_THEME) {
  const colors: Record<string, string> = {};
  for (const [name, value] of Object.entries(theme)) {
    if (value.kind === "raw") {
      continue;
    }
    const resolved = value.kind === "oklch" ? value.color : resolveThemeColor(name, theme);
    if (resolved !== null) {
      colors[name] = oklchToHex(resolved);
    }
  }
  return colors;
}

export const FUTROB_BRAND_HEX = oklchToHex(BRAND_SCALE[500]);
