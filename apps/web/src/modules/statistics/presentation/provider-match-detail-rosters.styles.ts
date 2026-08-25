import * as stylex from "@stylexjs/stylex";
import { typography } from "@futrob/ui";
import { colors, media } from "@futrob/ui/styles/public.stylex";
export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "2.5rem",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  heading: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  crest: {
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
  },
  headingCopy: {
    minWidth: 0,
  },
  muted: {
    color: colors.mutedForeground,
  },
  teamName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  empty: {
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    paddingInline: "1rem",
    paddingBlock: "1.25rem",
    color: colors.mutedForeground,
  },
  list: {
    overflow: "hidden",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    borderBottomWidth: {
      default: 1,
      ":last-child": 0,
    },
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingInline: {
      default: "1rem",
      [media.sm]: "1.25rem",
    },
    paddingBlock: "1rem",
  },
  rowHeader: {
    marginBottom: "1rem",
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
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
    gap: "0.5rem",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [media.sm]: "repeat(4, minmax(0, 1fr))",
      [media.lg]: "repeat(7, minmax(0, 1fr))",
    },
    columnGap: "1rem",
    rowGap: "0.75rem",
  },
  metric: {
    minWidth: 0,
  },
  metricLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
  },
  metricValue: {
    marginTop: "0.125rem",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },
});

export const rosterTypography = {
  caption: typography.caption,
  subtitle: typography.subtitle,
};
