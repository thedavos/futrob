import * as stylex from "@stylexjs/stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const rankingsStyles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space.s5,
    minWidth: 0,
  },
  kindsWrap: {
    display: "inline-flex",
    maxWidth: "100%",
    overflowX: "auto",
    scrollbarWidth: "none",
    padding: "0.25rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
  },
  kinds: {
    display: "flex",
    gap: "0.25rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  kind: {
    display: "inline-flex",
    minHeight: "var(--control-height-dense)",
    alignItems: "center",
    paddingInline: space.s3,
    borderRadius: "var(--corner-md)",
    color: {
      default: colors.mutedForeground,
      ":hover": colors.foreground,
    },
    backgroundColor: {
      default: "transparent",
      ":hover": colors.surfaceRaised,
    },
    textDecoration: "none",
    whiteSpace: "nowrap",
    transitionProperty: "background-color, color",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
  },
  kindActive: {
    backgroundColor: { default: colors.primary, ":hover": colors.primaryHover },
    color: { default: colors.primaryForeground, ":hover": colors.primaryForeground },
    fontWeight: "var(--font-weight-semibold)",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.375rem 0.75rem",
  },
  metaStrong: {
    color: colors.foreground,
  },
  metaSep: {
    color: colors.textTertiary,
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.s3,
  },
  searchSlot: {
    flexGrow: { default: 1, [media.sm]: 0 },
    width: { default: "100%", [media.sm]: "16rem" },
  },
  teamSlot: {
    flexGrow: { default: 1, [media.sm]: 0 },
    minWidth: "12rem",
  },
  filterTrigger: {
    width: "100%",
  },
  filterCount: {
    marginLeft: { default: 0, [media.md]: "auto" },
  },
  abbr: {
    textDecorationLine: "none",
    cursor: "help",
  },
  positionCell: {
    position: "relative",
    paddingLeft: "0.75rem",
    whiteSpace: "nowrap",
  },
  leaderBar: {
    position: "absolute",
    left: 0,
    top: "0.375rem",
    bottom: "0.375rem",
    width: "0.1875rem",
    borderRadius: "var(--corner-xs)",
    backgroundColor: colors.primary,
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
    minWidth: 0,
  },
  playerName: {
    fontWeight: "var(--font-weight-semibold)",
    color: colors.foreground,
    overflowWrap: "anywhere",
  },
  wideOnly: {
    display: { default: "none", [media.sm]: "table-cell" },
  },
  metricCell: {
    fontWeight: "var(--font-weight-bold)",
    color: colors.foreground,
  },
  metricLeader: {
    color: colors.primary,
  },
});
