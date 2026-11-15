import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  page: { width: "100%", maxWidth: "48rem", display: "flex", flexDirection: "column", gap: "2rem" },
  stack: { display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 },
  row: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem" },
  section: { display: "flex", flexDirection: "column", gap: "1rem" },
  actions: { display: "flex", flexWrap: "wrap", gap: "0.75rem" },
  choice: { display: "flex", alignItems: "center", minHeight: 44, gap: "0.75rem" },
  avatar: { width: "4rem", height: "4rem" },
  dialog: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    width: "min(32rem, calc(100vw - 2rem))",
    maxHeight: "calc(100dvh - 2rem)",
    overflowY: "auto",
  },
  path: { overflowWrap: "anywhere" },
  skeleton: { height: "4rem", width: "100%" },
  footer: { marginTop: 0 },
});
