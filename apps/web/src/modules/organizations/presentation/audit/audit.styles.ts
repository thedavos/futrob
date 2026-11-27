import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  body: { display: "grid", minWidth: 0, gap: "1.5rem" },
  filters: {
    display: "grid",
    minWidth: 0,
    gap: "1rem",
    gridTemplateColumns: { default: "minmax(0, 1fr)", [media.md]: "repeat(3, minmax(0, 1fr))" },
  },
  filterActions: { display: "flex", alignItems: "end", flexWrap: "wrap", gap: "0.75rem" },
  table: { minWidth: "54rem" },
  /** Grid child that holds the skeleton table; lets the table scroll inside it. */
  skeletonTableFrame: { minWidth: 0 },
  text: { maxWidth: "28rem", overflowWrap: "anywhere" },
  stack: { display: "grid", gap: "0.25rem", minWidth: 0, overflowWrap: "anywhere" },
  pagination: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  },
  paginationActions: { display: "flex", gap: "0.75rem" },
  skeletonDate: { width: "8.5rem", maxWidth: "100%", height: "0.875rem" },
  skeletonActor: { width: "7.5rem", maxWidth: "100%", height: "0.875rem" },
  skeletonActorId: { width: "5.5rem", maxWidth: "100%", height: "0.75rem" },
  skeletonAction: { width: "11rem", maxWidth: "100%", height: "0.875rem" },
  skeletonReason: { width: "16rem", maxWidth: "100%", height: "0.875rem" },
  skeletonObject: { width: "12rem", maxWidth: "100%", height: "0.875rem" },
  skeletonRequest: { width: "9rem", maxWidth: "100%", height: "0.75rem" },
  skeletonPageButton: { width: "6.5rem", height: "var(--control-height)" },
  tabs: {
    display: "flex",
    gap: "1.5rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--control-height)",
    color: colors.mutedForeground,
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    textDecoration: "none",
  },
  activeTab: { color: colors.foreground, borderBottomColor: colors.primary },
});
