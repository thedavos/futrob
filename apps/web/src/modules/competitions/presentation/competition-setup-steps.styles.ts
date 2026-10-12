import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  section: {
    display: "grid",
    gap: "1.5rem",
  },
  subsection: {
    display: "grid",
    gap: "1.5rem",
  },
  pair: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  columns: {
    display: "grid",
    alignItems: "start",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 1.5fr) minmax(18rem, 0.85fr)",
    },
  },
  content: {
    display: "grid",
    gap: "1.5rem",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  fieldset: {
    display: "grid",
    gap: "1.25rem",
    borderWidth: 0,
    padding: 0,
  },
});
