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
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "repeat(3, minmax(0, 1fr))",
    },
    gap: "1rem",
    margin: 0,
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: 0,
  },
  metaTerm: {
    color: colors.mutedForeground,
  },
  metaValue: {
    margin: 0,
    color: colors.foreground,
    overflowWrap: "anywhere",
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
    textAlign: "end",
    whiteSpace: "nowrap",
  },
  numeric: {
    textAlign: "end",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  metric: {
    textAlign: "end",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
    minWidth: 0,
  },
  playerName: {
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
  alertBody: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
});
