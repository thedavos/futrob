import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    minWidth: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  skeleton: {
    minHeight: "7.5rem",
    width: "100%",
    borderRadius: "var(--corner-xl)",
  },
});
