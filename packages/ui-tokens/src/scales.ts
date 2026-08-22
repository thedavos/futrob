import { oklch, type Oklch } from "./oklch.ts";

/**
 * Raw brand and accent scales. Single source of truth for web (rendered into
 * `packages/ui/src/tokens.css`) and mobile (resolved to sRGB at runtime).
 * Values are mirrored 1:1; `tokens-sync.test.ts` enforces parity.
 */

export const BRAND_SCALE = {
  50: oklch(0.973, 0.032, 149.579),
  100: oklch(0.944, 0.065, 149.579),
  200: oklch(0.891, 0.112, 149.579),
  300: oklch(0.82, 0.165, 149.579),
  400: oklch(0.752, 0.197, 149.579),
  500: oklch(0.723, 0.192, 149.579),
  600: oklch(0.625, 0.175, 149.579),
  700: oklch(0.527, 0.142, 149.579),
  800: oklch(0.441, 0.111, 149.579),
  900: oklch(0.385, 0.088, 149.579),
  950: oklch(0.238, 0.05, 149.579),
} satisfies Record<string, Oklch>;

export const NEUTRAL_SCALE = {
  0: oklch(1, 0, 0),
  50: oklch(0.985, 0.004, 149.579),
  100: oklch(0.965, 0.006, 149.579),
  200: oklch(0.925, 0.009, 149.579),
  300: oklch(0.86, 0.011, 149.579),
  400: oklch(0.71, 0.012, 149.579),
  450: oklch(0.64, 0.012, 149.579),
  500: oklch(0.56, 0.012, 149.579),
  600: oklch(0.45, 0.012, 149.579),
  700: oklch(0.36, 0.012, 149.579),
  800: oklch(0.275, 0.012, 149.579),
  850: oklch(0.24, 0.012, 149.579),
  900: oklch(0.205, 0.012, 149.579),
  950: oklch(0.135, 0.012, 149.579),
  1000: oklch(0, 0, 0),
} satisfies Record<string, Oklch>;

export const RED_SCALE = {
  50: oklch(0.971, 0.013, 17.38),
  100: oklch(0.936, 0.032, 17.717),
  300: oklch(0.808, 0.114, 19.571),
  500: oklch(0.637, 0.237, 25.331),
  700: oklch(0.505, 0.213, 27.518),
  900: oklch(0.396, 0.141, 25.723),
} satisfies Record<string, Oklch>;

export const AMBER_SCALE = {
  50: oklch(0.987, 0.022, 95.277),
  100: oklch(0.962, 0.059, 95.617),
  300: oklch(0.879, 0.169, 91.605),
  500: oklch(0.769, 0.188, 70.08),
  700: oklch(0.555, 0.163, 48.998),
  900: oklch(0.414, 0.112, 45.904),
} satisfies Record<string, Oklch>;

export const BLUE_SCALE = {
  50: oklch(0.97, 0.014, 254.604),
  100: oklch(0.932, 0.032, 255.585),
  300: oklch(0.809, 0.105, 251.813),
  500: oklch(0.623, 0.214, 259.815),
  700: oklch(0.488, 0.243, 264.376),
  900: oklch(0.379, 0.146, 265.522),
} satisfies Record<string, Oklch>;

/** Categorical highlight scale. Not mapped to Tailwind — consume via `emphasis`. */
export const VIOLET_SCALE = {
  50: oklch(0.97, 0.014, 300),
  100: oklch(0.932, 0.032, 300),
  300: oklch(0.809, 0.105, 300),
  500: oklch(0.623, 0.18, 300),
  700: oklch(0.488, 0.2, 300),
  900: oklch(0.379, 0.146, 300),
} satisfies Record<string, Oklch>;
