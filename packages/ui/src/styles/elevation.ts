import * as stylex from "@stylexjs/stylex";

/**
 * Ambient elevation. Values live in `elevation.css` (former shadow-plugin
 * `smooth-shadow-ring-*`). Never pair these with border/ring on the same element.
 */
export const elevation = stylex.create({
  sm: {
    boxShadow: "var(--elevation-shadow-sm)",
  },
  md: {
    boxShadow: "var(--elevation-shadow-md)",
  },
  lg: {
    boxShadow: "var(--elevation-shadow-lg)",
  },
});
