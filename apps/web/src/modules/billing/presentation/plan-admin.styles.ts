import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  body: { display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" },
  pending: { fontSize: "0.875rem", lineHeight: "1.25rem", color: colors.mutedForeground },
  panel: { minWidth: 0, display: "flex", flexDirection: "column" },
  header: { padding: "1.25rem", gap: "0.5rem" },
  content: {
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  form: { display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "32rem" },
  choices: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    border: 0,
    padding: 0,
    margin: 0,
  },
  legend: { fontWeight: 600, padding: 0 },
  actions: { display: "flex", flexWrap: "wrap", gap: "0.75rem" },
  muted: { color: colors.mutedForeground },
  skeletonStack: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  skeletonRow: { height: "6rem", width: "100%" },
});
