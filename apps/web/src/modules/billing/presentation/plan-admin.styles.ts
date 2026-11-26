import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  body: { display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" },
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
  fieldBone: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    gap: "0.5rem",
  },
  labelBone: {
    width: "9rem",
    maxWidth: "100%",
    height: "1rem",
  },
  inputBone: {
    width: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
  legendBone: {
    width: "3rem",
    height: "1rem",
  },
  pills: {
    display: "grid",
    gap: "0.75rem",
  },
  pillBone: {
    width: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-full)",
  },
  hintBone: {
    width: "100%",
    maxWidth: "22rem",
    height: "0.75rem",
  },
  submitBone: {
    width: "8.5rem",
    maxWidth: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
  orgBone: {
    width: "8rem",
    maxWidth: "100%",
    height: "1rem",
  },
  planBone: {
    width: "4rem",
    maxWidth: "100%",
    height: "1rem",
  },
  dateBone: {
    width: "6rem",
    maxWidth: "100%",
    height: "1rem",
  },
  actionBone: {
    width: "5.5rem",
    maxWidth: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
});
