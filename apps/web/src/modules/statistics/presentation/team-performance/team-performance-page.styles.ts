import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    minWidth: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  sectionHead: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  table: {
    minWidth: "56rem",
  },
  headStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.125rem",
  },
  weight: {
    color: colors.mutedForeground,
    fontWeight: 400,
  },
  numeric: {
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  scoreValue: {
    color: colors.foreground,
    fontWeight: 600,
  },
  team: {
    display: "block",
    minWidth: "11rem",
    maxWidth: "16rem",
    overflowWrap: "anywhere",
    fontWeight: 600,
  },
  teamUnknown: {
    color: colors.mutedForeground,
    fontWeight: 500,
  },
  teamSkeleton: {
    width: "8rem",
    height: "1rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
  coverage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
    minWidth: "11rem",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  scrollHint: {
    display: { default: "block", [media.lg]: "none" },
  },
  criteria: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: { default: "1rem", [media.sm]: "1.5rem" },
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    minWidth: 0,
  },
  weights: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: "0.25rem",
    minHeight: "var(--control-height)",
  },
  chevron: {
    width: "1rem",
    height: "1rem",
  },
  skeletonStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  skeletonRow: {
    width: "100%",
    height: "3rem",
    borderRadius: "var(--corner-lg)",
  },
});
