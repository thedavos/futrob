import * as stylex from "@stylexjs/stylex";

/** Values from `elevation.css`. Do not pair with border or ring. */
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
