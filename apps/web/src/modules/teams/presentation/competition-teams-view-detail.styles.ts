import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  emptyWrap: {
    display: "flex",
    minHeight: 0,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  empty: {
    minHeight: 0,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    borderWidth: 0,
  },
  loading: {
    display: "grid",
    gap: "1rem",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  skeletonTitle: {
    height: "2.5rem",
    width: "16rem",
    maxWidth: "100%",
  },
  skeletonStats: {
    height: "7rem",
  },
  skeletonTable: {
    height: "16rem",
  },
  detail: {
    display: "grid",
    gap: "2rem",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1.5rem",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.75rem",
  },
  back: {
    alignSelf: "flex-start",
    display: {
      default: null,
      [media.md]: "none",
    },
  },
  titleBlock: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.5rem",
  },
  titleRow: {
    display: "flex",
    minWidth: 0,
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  title: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: 700,
    letterSpacing: "var(--tracking-tight)",
    textWrap: "balance",
  },
  muted: {
    color: colors.mutedForeground,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  stats: {
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "1rem",
  },
  roster: {
    display: "grid",
    gap: "0.75rem",
  },
  rosterHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  sectionTitle: {
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 600,
  },
  player: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  avatar: {
    width: "2rem",
    height: "2rem",
  },
  playerName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  role: {
    fontWeight: 500,
  },
  decision: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1.5rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    padding: "1rem",
  },
  decisionCopy: {
    display: "flex",
    minWidth: 0,
    maxWidth: "65ch",
    flexDirection: "column",
    gap: "0.25rem",
  },
});
