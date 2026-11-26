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
  tabListSkeleton: {
    position: "relative",
    display: "flex",
    overflowX: "auto",
    maxWidth: "100%",
    minHeight: "var(--control-height)",
    alignItems: "flex-end",
    gap: "1.25rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  skeletonTabLabel: {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    minWidth: "var(--control-height)",
    minHeight: "var(--control-height)",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
  },
  skeletonMetaValue: {
    width: "80%",
    maxWidth: "16rem",
    height: "1.25rem",
  },
  skeletonPosition: {
    width: "1.25rem",
    height: "1rem",
    marginInlineStart: "auto",
  },
  skeletonNumeric: {
    width: "1.5rem",
    height: "1rem",
    marginInlineStart: "auto",
  },
  skeletonMetric: {
    width: "1.75rem",
    height: "1rem",
    marginInlineStart: "auto",
  },
  skeletonTeam: {
    height: "0.75rem",
    width: "6rem",
    maxWidth: "80%",
  },
  exitLink: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--control-height)",
  },
});
