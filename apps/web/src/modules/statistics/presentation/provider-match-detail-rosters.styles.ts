import * as stylex from "@stylexjs/stylex";
import { typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  section: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
  intro: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  subtitle: {
    color: colors.mutedForeground,
  },
  tables: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(2, minmax(0, 1fr))",
    },
    alignItems: "start",
    gap: "1.5rem",
  },
  table: {
    minWidth: 0,
    overflow: "hidden",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clubHeader: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gridTemplateRows: "auto auto",
    columnGap: "0.75rem",
    rowGap: "0.125rem",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    backgroundColor: "color-mix(in oklab, var(--muted) 60%, transparent)",
    paddingInline: "1rem",
    paddingBlock: "0.875rem",
  },
  crest: {
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
    gridColumn: 1,
    gridRow: "1 / span 2",
  },
  teamName: {
    minWidth: 0,
    gridColumn: 2,
    gridRow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  winner: {
    gridColumn: 3,
    gridRow: 1,
    justifySelf: "end",
  },
  playerCount: {
    gridColumn: 2,
    gridRow: 2,
    color: colors.mutedForeground,
  },
  tableContainer: {
    overflowX: "auto",
    borderWidth: 0,
    borderRadius: 0,
  },
  playerCell: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  playerName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  badges: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.375rem",
  },
  position: {
    whiteSpace: "nowrap",
  },
  numeric: {
    textAlign: "end",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
});

export const rosterTypography = {
  caption: typography.caption,
  label: typography.label,
  subtitle: typography.subtitle,
};
