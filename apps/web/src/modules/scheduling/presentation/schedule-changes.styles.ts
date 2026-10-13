import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  section: { display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "end",
    gap: "1rem",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    maxWidth: "40rem",
    minWidth: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: 0,
    margin: 0,
    listStyle: "none",
  },
  request: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    paddingBlock: "1.25rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    minWidth: 0,
  },
  inline: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem 1rem" },
  meta: { display: "flex", flexDirection: "column", gap: "0.375rem", minWidth: 0 },
  history: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    paddingBlock: "1rem",
    paddingInline: "0.75rem",
    overflowWrap: "anywhere",
  },
  form: { display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "48rem" },
  choices: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr)", [media.lg]: "repeat(3, minmax(0, 1fr))" },
    gap: "0.75rem",
  },
  choice: { borderRadius: "var(--corner-lg)", justifyContent: "flex-start", textAlign: "start" },
  actions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" },
  warning: { color: colors.warning },
  reason: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  skeleton: { minHeight: "6rem", width: "100%" },
});
