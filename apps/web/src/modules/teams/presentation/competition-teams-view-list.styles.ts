import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  emptyWrap: {
    minWidth: 0,
    padding: "1.25rem",
  },
  empty: {
    minHeight: "16rem",
    minWidth: 0,
  },
  toolbar: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "1rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  pills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  pendingDot: {
    width: "0.375rem",
    height: "0.375rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.warning,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
  },
  item: {
    position: "relative",
    width: "100%",
    minHeight: "4.25rem",
    paddingBlock: "0.75rem",
    paddingLeft: "1rem",
    paddingRight: "0.875rem",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "color-mix(in oklab, var(--border-subtle) 65%, transparent)",
    textAlign: "start",
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-standard)",
    backgroundColor: {
      default: "transparent",
      ":hover": "color-mix(in oklab, var(--muted) 45%, transparent)",
      ":is([aria-current=true])": "color-mix(in oklab, var(--muted) 30%, transparent)",
      ":is([aria-current=true]):hover": "color-mix(in oklab, var(--muted) 50%, transparent)",
    },
    outlineColor: colors.ring,
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineWidth: 2,
    outlineOffset: -2,
  },
  itemLast: {
    borderBottomWidth: 0,
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
  row: {
    display: "flex",
    width: "100%",
    flexGrow: 1,
    minWidth: 0,
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  name: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "var(--text-sm)",
    lineHeight: "1.25rem",
    fontWeight: 500,
    color: colors.foreground,
  },
  selectedName: {
    fontWeight: 600,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "0.5rem",
    rowGap: "0.125rem",
  },
  meta: {
    fontVariantNumeric: "tabular-nums",
    color: colors.mutedForeground,
  },
  warningMeta: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: colors.warning,
    fontWeight: 500,
  },
  warningIcon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
  },
  filteredEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1.5rem 1rem",
    textAlign: "center",
  },
  filteredEmptyText: {
    color: colors.mutedForeground,
  },
  moreWrap: {
    padding: "0.75rem 1rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  more: {
    width: "100%",
  },
  spinner: {
    width: "1rem",
    height: "1rem",
    animationName: {
      default: spin,
      [media.reduceMotion]: "none",
    },
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});
