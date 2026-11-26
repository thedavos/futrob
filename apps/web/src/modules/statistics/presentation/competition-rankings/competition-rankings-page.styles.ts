import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  tabs: {
    minWidth: 0,
    gap: "1rem",
  },
  tabList: {
    maxWidth: "100%",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    minWidth: 0,
    paddingBlock: 0,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.375rem 0.75rem",
    minWidth: 0,
  },
  metaStrong: {
    color: colors.foreground,
    fontWeight: 500,
  },
  metaSep: {
    color: colors.textTertiary,
  },
  /** Table beside the player detail on wide desktops; the detail moves to an overlay below. */
  workspace: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.xl]: "minmax(0, 1fr) 22rem",
    },
    alignItems: "start",
    gap: "1rem",
    minWidth: 0,
  },
  filters: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "minmax(0, 1fr) minmax(10rem, 14rem)",
    },
    alignItems: "center",
    gap: "0.75rem 1rem",
  },
  filterCount: {
    gridColumn: "1 / -1",
    margin: 0,
  },
  tableSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    minWidth: 0,
  },
  table: {
    minWidth: "28rem",
  },
  position: {
    width: "3.5rem",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
  },
  positionCell: {
    position: "relative",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
  },
  abbr: {
    textDecorationLine: "none",
    cursor: "help",
  },
  /** Context columns stay quieter than the figure that orders the ranking (design.md §Datos). */
  secondaryHead: {
    color: colors.mutedForeground,
  },
  secondary: {
    color: colors.mutedForeground,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
  },
  metricHead: {
    color: colors.foreground,
  },
  metric: {
    color: colors.foreground,
    fontSize: "1rem",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  selectableRow: {
    cursor: "pointer",
    outlineColor: colors.ring,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    outlineOffset: -2,
  },
  selectionBar: {
    position: "absolute",
    insetInlineStart: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    pointerEvents: "none",
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
    minWidth: 0,
  },
  playerName: {
    fontWeight: 500,
    overflowWrap: "anywhere",
  },
  playerNameSelected: {
    fontWeight: 600,
    overflowWrap: "anywhere",
  },
  unnamed: {
    color: colors.mutedForeground,
    fontWeight: 500,
  },
  teamName: {
    overflowWrap: "anywhere",
  },
  nameSkeleton: {
    height: "1rem",
    width: "8rem",
    maxWidth: "100%",
  },
  skeletonTabs: {
    height: "var(--control-height)",
    width: "100%",
    borderRadius: "var(--corner-lg)",
  },
  skeletonKpis: {
    height: "5.75rem",
    width: "100%",
    borderRadius: "var(--corner-lg)",
  },
  skeletonTable: {
    height: "16rem",
    width: "100%",
    borderRadius: "var(--corner-lg)",
  },
  exitLink: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--control-height)",
  },
});
