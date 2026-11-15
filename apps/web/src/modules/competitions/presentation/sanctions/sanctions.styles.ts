import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  section: {
    display: "grid",
    minWidth: 0,
    gap: "0.75rem",
  },
  sectionHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  loading: {
    display: "grid",
    gap: "0.75rem",
  },
  skeleton: {
    height: "3.5rem",
  },
  stack: {
    display: "grid",
    gap: "0.25rem",
    minWidth: 0,
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.375rem",
  },
  table: {
    minWidth: "48rem",
  },
  reason: {
    maxWidth: "28rem",
    overflowWrap: "anywhere",
  },
  muted: {
    color: colors.mutedForeground,
  },
  dialogFields: {
    display: "grid",
    gap: "1rem",
    paddingBlock: "1rem",
  },
  fieldRow: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: { default: "1fr", [media.sm]: "1fr 1fr" },
  },
});
