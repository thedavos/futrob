import * as stylex from "@stylexjs/stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const standingsStyles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space.s6,
    minWidth: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space.s4,
    minWidth: 0,
  },
  metaBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem 1rem",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.375rem 0.75rem",
    margin: 0,
  },
  metaSep: {
    color: colors.textTertiary,
  },
  columnsToggle: {
    display: { default: "inline-flex", [media.md]: "none" },
  },
  abbr: {
    textDecorationLine: "none",
    cursor: "help",
  },
  secondaryCol: {
    display: { default: "none", [media.md]: "table-cell" },
  },
  formCol: {
    display: { default: "none", [media.sm]: "table-cell" },
  },
  rowAboveCut: {
    borderBottomWidth: 1,
    borderBottomStyle: "dashed",
    borderBottomColor: colors.borderStrong,
  },
  positionCell: {
    position: "relative",
    paddingLeft: "0.75rem",
    whiteSpace: "nowrap",
  },
  zoneBar: {
    position: "absolute",
    left: 0,
    top: "0.375rem",
    bottom: "0.375rem",
    width: "0.1875rem",
    borderRadius: "var(--corner-xs)",
    backgroundColor: colors.primary,
  },
  positionValue: {
    color: colors.mutedForeground,
  },
  positionLeader: {
    color: colors.primary,
    fontWeight: "var(--font-weight-semibold)",
  },
  teamCell: {
    minWidth: "10rem",
    overflowWrap: "anywhere",
  },
  teamWrap: {
    display: "flex",
    alignItems: "center",
    gap: space.s3,
    minWidth: 0,
  },
  crest: {
    width: "1.75rem",
    height: "1.75rem",
    flexShrink: 0,
  },
  teamName: {
    fontWeight: "var(--font-weight-semibold)",
    color: colors.foreground,
  },
  swissDetail: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.25rem 0.5rem",
    marginTop: "0.25rem",
  },
  swissProgress: {
    color: colors.foreground,
  },
  swissFinal: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: colors.foreground,
  },
  figurePositive: {
    color: colors.foreground,
  },
  pointsCell: {
    fontWeight: "var(--font-weight-bold)",
    color: colors.foreground,
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem 1rem",
    paddingTop: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 1rem",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    color: colors.mutedForeground,
  },
  legendBar: {
    display: "inline-block",
    width: "0.1875rem",
    height: "0.75rem",
    borderRadius: "var(--corner-xs)",
    backgroundColor: colors.primary,
  },
  legendDash: {
    display: "inline-block",
    width: "0.875rem",
    height: 0,
    borderTopWidth: 1,
    borderTopStyle: "dashed",
    borderTopColor: colors.borderStrong,
  },
  cutNote: {
    color: colors.foreground,
  },
});
