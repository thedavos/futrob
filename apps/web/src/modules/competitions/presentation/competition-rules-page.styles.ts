import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    minWidth: 0,
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
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: { default: "1.25rem", [media.sm]: "1.5rem" },
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    minWidth: 0,
  },
  sectionHead: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem 0.75rem",
  },
  heading: {
    margin: 0,
  },
  help: {
    margin: 0,
    color: colors.mutedForeground,
  },
  statusRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 0.75rem",
  },
  tiebreaks: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  tiebreak: {
    display: "grid",
    gridTemplateColumns: "1.5rem minmax(0, 1fr)",
    alignItems: "baseline",
    gap: "0.75rem",
  },
  tiebreakIndex: {
    color: colors.mutedForeground,
    fontWeight: 600,
  },
  note: {
    margin: 0,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "0.75rem 1rem",
  },
  skeleton: {
    height: "8rem",
    width: "100%",
  },
  retry: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
});
