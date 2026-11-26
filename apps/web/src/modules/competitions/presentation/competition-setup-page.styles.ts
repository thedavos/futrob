import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  main: {
    width: "100%",
    minWidth: 0,
  },
  titleRow: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  title: {
    width: "fit-content",
    minWidth: 0,
    maxWidth: "100%",
    flexShrink: 1,
  },
  stepper: {
    marginBottom: "2.5rem",
  },
  body: {
    display: "grid",
    gap: "1rem",
  },
});
