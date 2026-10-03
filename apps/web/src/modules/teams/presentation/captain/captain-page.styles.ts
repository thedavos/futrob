import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  content: {
    display: "grid",
    minWidth: 0,
    gap: "2rem",
  },
  errorBlock: {
    display: "grid",
    justifyItems: "start",
    gap: "0.75rem",
  },
  loading: {
    display: "grid",
    gap: "1rem",
  },
  skeletonStats: {
    height: "7rem",
  },
  skeletonTable: {
    height: "16rem",
  },
  stats: {
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "1rem",
  },
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
  muted: {
    color: colors.mutedForeground,
  },
});
