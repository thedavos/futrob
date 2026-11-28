import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  body: {
    display: "grid",
    minWidth: 0,
    gap: "1rem",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
    minWidth: 0,
  },
  selectField: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
    minWidth: {
      default: 0,
      [media.sm]: "12rem",
    },
    maxWidth: {
      default: "100%",
      [media.sm]: "16rem",
    },
  },
  selectContent: {
    maxHeight: "20rem",
    overflowY: "auto",
  },
  dateTrigger: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
    justifyContent: {
      default: "space-between",
      [media.sm]: "center",
    },
  },
  dateTriggerActive: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
    justifyContent: {
      default: "space-between",
      [media.sm]: "center",
    },
    borderColor: colors.primary,
    backgroundColor: "color-mix(in oklab, var(--primary) 8%, transparent)",
    color: colors.foreground,
  },
  datePopover: {
    width: "min(20rem, calc(100vw - 2rem))",
    display: "grid",
    gap: "0.75rem",
  },
  presetRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.375rem",
  },
  dateFields: {
    display: "grid",
    gap: "0.75rem",
  },
  datePopoverActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  desktopOnly: {
    display: {
      default: "none",
      [media.md]: "block",
    },
    minWidth: 0,
  },
  mobileOnly: {
    display: {
      default: "block",
      [media.md]: "none",
    },
    minWidth: 0,
  },
  table: {
    minWidth: "46rem",
  },
  clickableRow: {
    cursor: "pointer",
  },
  timeCell: {
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
    fontVariantNumeric: "tabular-nums",
  },
  badgeIcon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
  },
  actorCell: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    minWidth: 0,
  },
  avatar: {
    width: "1.5rem",
    height: "1.5rem",
    fontSize: "0.6875rem",
  },
  actorName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "12rem",
  },
  objectCell: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    minWidth: 0,
  },
  objectIcon: {
    width: "0.9375rem",
    height: "0.9375rem",
    color: colors.mutedForeground,
    flexShrink: 0,
  },
  reasonCell: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    maxWidth: "22rem",
    overflowWrap: "anywhere",
  },
  emptyDash: {
    color: colors.textTertiary,
  },
  detailActionCell: {
    width: "2.75rem",
    paddingInline: "0.25rem",
  },
  /* Mobile stacked editorial list (zero horizontal scroll at 360px) */
  mobileList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
  },
  mobileItem: {
    display: "grid",
    gap: "0.5rem",
    paddingBlock: "0.875rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "color-mix(in oklab, var(--border-subtle) 65%, transparent)",
    minWidth: 0,
  },
  mobileRowTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  mobileRowMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    flexWrap: "wrap",
    minWidth: 0,
  },
  mobileReason: {
    color: colors.mutedForeground,
    overflowWrap: "anywhere",
  },
  mobileFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  /* Pagination */
  pagination: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingTop: "0.25rem",
  },
  paginationActions: {
    display: "flex",
    gap: "0.5rem",
  },
  /* Detail Sheet */
  sheetHeaderBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  sheetBodyStack: {
    display: "grid",
    gap: "1.25rem",
    minWidth: 0,
  },
  sheetSection: {
    display: "grid",
    gap: "0.5rem",
    minWidth: 0,
  },
  reasonBlock: {
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.75rem 0.875rem",
    overflowWrap: "anywhere",
  },
  actorDetailRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  copyValueRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    minWidth: 0,
  },
  monoValue: {
    fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
    fontSize: "0.75rem",
    lineHeight: "1.125rem",
    color: colors.foreground,
    overflowWrap: "anywhere",
    minWidth: 0,
  },
  /* Loading skeleton */
  skeletonTableFrame: {
    minWidth: 0,
  },
  skeletonDate: { width: "7rem", maxWidth: "100%", height: "0.875rem" },
  skeletonBadge: { width: "8.5rem", maxWidth: "100%", height: "1.5rem", borderRadius: "999px" },
  skeletonActor: { width: "7.5rem", maxWidth: "100%", height: "0.875rem" },
  skeletonObject: { width: "8.5rem", maxWidth: "100%", height: "0.875rem" },
  skeletonReason: { width: "12rem", maxWidth: "100%", height: "0.875rem" },
  skeletonPageButton: { width: "6rem", height: "var(--control-height-dense)" },
});
