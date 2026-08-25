import * as stylex from "@stylexjs/stylex";

/**
 * Breakpoints Futrob already used (40rem / 48rem / 64rem / 80rem).
 * `maxSm` is the touch-density cutoff (`max-sm:`).
 */
export const media = stylex.defineConsts({
  sm: "@media (min-width: 40rem)",
  md: "@media (min-width: 48rem)",
  lg: "@media (min-width: 64rem)",
  xl: "@media (min-width: 80rem)",
  maxSm: "@media (max-width: 39.999rem)",
  reduceMotion: "@media (prefers-reduced-motion: reduce)",
});
