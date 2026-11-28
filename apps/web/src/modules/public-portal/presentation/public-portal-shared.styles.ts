import * as stylex from "@stylexjs/stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const sharedStyles = stylex.create({
  form: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    verticalAlign: "middle",
  },
  formNarrow: {
    display: { default: "flex", [media.sm]: "none" },
    marginTop: "0.375rem",
  },
  formResult: {
    display: "inline-grid",
    placeItems: "center",
    width: "1.375rem",
    height: "1.375rem",
    borderRadius: "0.3125rem",
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: "0.6875rem",
    lineHeight: 1,
    fontWeight: "var(--font-weight-bold)",
  },
  formCompact: {
    width: "1.1875rem",
    height: "1.1875rem",
  },
  formWin: {
    backgroundColor: colors.approvedSubtle,
    borderColor: "color-mix(in oklab, var(--success) 32%, transparent)",
    color: colors.success,
  },
  formDraw: {
    backgroundColor: "color-mix(in oklab, var(--warning) 14%, transparent)",
    borderColor: "color-mix(in oklab, var(--warning) 32%, transparent)",
    color: colors.warning,
  },
  formLoss: {
    backgroundColor: "color-mix(in oklab, var(--danger) 14%, transparent)",
    borderColor: "color-mix(in oklab, var(--danger) 32%, transparent)",
    color: colors.danger,
  },
  formLatest: {
    borderColor: "currentColor",
  },
  formEmpty: {
    display: "inline-block",
    width: "1.375rem",
    height: "1.375rem",
    borderRadius: "0.3125rem",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyle: "none",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  listBare: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  listItem: {
    borderTopWidth: { default: 1, ":first-child": 0 },
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  row: {
    display: "grid",
    alignItems: "center",
    gap: "0.5rem 1rem",
    paddingBlock: space.s3,
    paddingInline: space.s4,
    gridTemplateColumns: {
      default: "minmax(0, 1fr) auto",
      [media.md]: "8.5rem minmax(0, 1fr) auto",
    },
  },
  rowCompact: {
    paddingInline: 0,
    gridTemplateColumns: {
      default: "minmax(0, 1fr) auto",
      [media.sm]: "minmax(0, 1fr) auto",
    },
  },
  when: {
    gridColumn: {
      default: "1 / -1",
      [media.md]: "auto",
    },
    fontVariantNumeric: "tabular-nums",
  },
  whenCompact: {
    gridColumn: "1 / -1",
  },
  matchup: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "minmax(0, 1fr) auto minmax(0, 1fr)",
    },
    alignItems: "center",
    gap: {
      default: "0.25rem",
      [media.sm]: "0.75rem",
    },
    minWidth: 0,
  },
  sideHome: {
    display: "flex",
    alignItems: "center",
    justifyContent: {
      default: "flex-start",
      [media.sm]: "flex-end",
    },
    gap: space.s2,
    minWidth: 0,
    textAlign: {
      default: "start",
      [media.sm]: "end",
    },
  },
  sideAway: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: space.s2,
    minWidth: 0,
    textAlign: "start",
  },
  teamName: {
    overflowWrap: "anywhere",
    minWidth: 0,
  },
  crest: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  centerPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.25rem",
    justifySelf: {
      default: "start",
      [media.sm]: "center",
    },
    paddingInline: "0.625rem",
    paddingBlock: "0.25rem",
    borderRadius: "var(--corner-md)",
    backgroundColor: colors.muted,
    whiteSpace: "nowrap",
  },
  vsText: {
    color: colors.mutedForeground,
    fontWeight: "var(--font-weight-semibold)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  scoreLead: {
    color: colors.primary,
  },
  scoreDash: {
    color: colors.mutedForeground,
    paddingInline: "0.125rem",
  },
  statusCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.s2,
    flexShrink: 0,
  },
  statusIcon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
  },
});
