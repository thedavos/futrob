import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  sectionHead: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    minHeight: "var(--control-height)",
    padding: { default: "1rem", [media.sm]: "1rem 1.5rem" },
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.border, ":hover": colors.borderStrong },
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.surface,
    color: "inherit",
    textDecoration: "none",
    minWidth: 0,
    outlineColor: colors.ring,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    outlineOffset: 2,
  },
  rowMeta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem 0.75rem",
  },
  matchup: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    gap: "0.75rem",
  },
  home: {
    textAlign: "end",
    overflowWrap: "anywhere",
  },
  away: {
    textAlign: "start",
    overflowWrap: "anywhere",
  },
  vs: {
    color: colors.mutedForeground,
    fontWeight: 700,
  },
  skeleton: {
    minHeight: "7.5rem",
    width: "100%",
    borderRadius: "var(--corner-xl)",
  },
});
