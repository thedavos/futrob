import {
  GEOMETRY_TOKENS,
  LIGHT_THEME,
  TYPOGRAPHY_TOKENS,
  themeToHexColors,
  type TokenValue,
  type TypoRole,
} from "@futrob/ui-tokens";
import type { TextStyle } from "react-native";

/**
 * Mobile theme built from `@futrob/ui-tokens`.
 * Unit mapping: 1rem = 16dp (density-independent pixels on Android,
 * points on iOS). Colors resolve OKLCH → sRGB hex at module load.
 */

const REM = 16;

function remToDp(value: string): number {
  return Number.parseFloat(value) * REM;
}

function rawValue(token: TokenValue): string {
  if (token.kind !== "raw") {
    throw new Error(`Expected a raw token, received ${token.kind}`);
  }
  return token.value;
}

function refName(token: TokenValue): string | null {
  return token.kind === "ref" ? token.name : null;
}

export const themeColors = themeToHexColors(LIGHT_THEME);

export type ThemeColorName = keyof typeof themeColors;

const FONT_FAMILY = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
} as const;

type FontKey = keyof typeof FONT_FAMILY;

/** Maps a `typo-<role>-weight` token (`var(--font-weight-bold)`) to a font key. */
function fontKeyForWeight(token: TokenValue): FontKey {
  const name = refName(token);
  if (name === null || !name.startsWith("font-weight-")) {
    return "regular";
  }
  switch (name.slice("font-weight-".length)) {
    case "500":
      return "medium";
    case "600":
      return "semibold";
    case "700":
      return "bold";
    default:
      return "regular";
  }
}

type FontWeightValue = Exclude<TextStyle["fontWeight"], undefined>;

/** Numeric weight string expected by RN for non-regular keys. */
function fontWeightFor(fontKey: FontKey): FontWeightValue | undefined {
  switch (fontKey) {
    case "regular":
      return undefined;
    case "medium":
      return "500";
    case "semibold":
      return "600";
    case "bold":
      return "700";
  }
}

const ROLE_CACHE = new Map<TypoRole, TextStyle>();

export function typoStyle(role: TypoRole): TextStyle {
  const cached = ROLE_CACHE.get(role);
  if (cached) {
    return cached;
  }

  const size = remToDp(rawValue(TYPOGRAPHY_TOKENS[`typo-${role}-size`]));
  const fontKey = fontKeyForWeight(TYPOGRAPHY_TOKENS[`typo-${role}-weight`]);
  const leading = Number.parseFloat(rawValue(TYPOGRAPHY_TOKENS[`typo-${role}-leading`]));
  const trackingEm = Number.parseFloat(rawValue(TYPOGRAPHY_TOKENS[`typo-${role}-tracking`]));

  const style: TextStyle = {
    fontSize: size,
    fontFamily: FONT_FAMILY[fontKey],
    fontWeight: fontWeightFor(fontKey),
    lineHeight: Math.round(size * leading),
    letterSpacing: trackingEm === 0 ? undefined : Math.round(trackingEm * size * 100) / 100,
  };

  ROLE_CACHE.set(role, style);
  return style;
}

export interface FutrobTheme {
  readonly colors: typeof themeColors;
  readonly spacing: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    8: number;
    10: number;
    12: number;
    16: number;
    20: number;
  };
  readonly corner: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    "2xl": number;
    "3xl": number;
    full: number;
  };
  /** Universal control height: 44dp (tokens.css --control-height). */
  readonly controlHeight: number;
  readonly textSizes: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
  };
  readonly fontFamily: typeof FONT_FAMILY;
  readonly typo: typeof typoStyle;
}

export const theme: FutrobTheme = {
  colors: themeColors,

  spacing: {
    0: remToDp(rawValue(GEOMETRY_TOKENS["space-0"])),
    1: remToDp(rawValue(GEOMETRY_TOKENS["space-1"])),
    2: remToDp(rawValue(GEOMETRY_TOKENS["space-2"])),
    3: remToDp(rawValue(GEOMETRY_TOKENS["space-3"])),
    4: remToDp(rawValue(GEOMETRY_TOKENS["space-4"])),
    5: remToDp(rawValue(GEOMETRY_TOKENS["space-5"])),
    6: remToDp(rawValue(GEOMETRY_TOKENS["space-6"])),
    8: remToDp(rawValue(GEOMETRY_TOKENS["space-8"])),
    10: remToDp(rawValue(GEOMETRY_TOKENS["space-10"])),
    12: remToDp(rawValue(GEOMETRY_TOKENS["space-12"])),
    16: remToDp(rawValue(GEOMETRY_TOKENS["space-16"])),
    20: remToDp(rawValue(GEOMETRY_TOKENS["space-20"])),
  },

  corner: {
    xs: remToDp(rawValue(GEOMETRY_TOKENS["corner-xs"])),
    sm: remToDp(rawValue(GEOMETRY_TOKENS["corner-sm"])),
    md: remToDp(rawValue(GEOMETRY_TOKENS["corner-md"])),
    lg: remToDp(rawValue(GEOMETRY_TOKENS["corner-lg"])),
    xl: remToDp(rawValue(GEOMETRY_TOKENS["corner-xl"])),
    "2xl": remToDp(rawValue(GEOMETRY_TOKENS["corner-2xl"])),
    "3xl": remToDp(rawValue(GEOMETRY_TOKENS["corner-3xl"])),
    full: remToDp(rawValue(GEOMETRY_TOKENS["corner-full"])),
  },

  controlHeight: remToDp(rawValue(GEOMETRY_TOKENS["control-height"])),

  textSizes: {
    xs: remToDp(rawValue(TYPOGRAPHY_TOKENS["text-xs"])),
    sm: remToDp(rawValue(TYPOGRAPHY_TOKENS["text-sm"])),
    base: remToDp(rawValue(TYPOGRAPHY_TOKENS["text-base"])),
    lg: remToDp(rawValue(TYPOGRAPHY_TOKENS["text-lg"])),
    xl: remToDp(rawValue(TYPOGRAPHY_TOKENS["text-xl"])),
  },

  fontFamily: FONT_FAMILY,
  typo: typoStyle,
};
