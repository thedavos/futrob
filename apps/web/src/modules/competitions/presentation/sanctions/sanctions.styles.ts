import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  section: {
    display: "grid",
    minWidth: 0,
    gap: "0.75rem",
  },
  loadingRegion: {
    minWidth: 0,
  },
  sectionHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  imposeSkeleton: {
    width: "8.5rem",
    maxWidth: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-md)",
  },
  boneType: {
    width: "8rem",
    maxWidth: "100%",
    height: "1rem",
  },
  boneDetail: {
    width: "4.5rem",
    maxWidth: "70%",
    height: "0.75rem",
  },
  boneTarget: {
    width: "7.5rem",
    maxWidth: "100%",
    height: "1rem",
  },
  boneTeam: {
    width: "10rem",
    maxWidth: "100%",
    height: "0.75rem",
  },
  boneReason: {
    width: "16rem",
    maxWidth: "100%",
    height: "1rem",
  },
  boneDate: {
    width: "7.5rem",
    height: "1rem",
  },
  boneBadge: {
    width: "4.5rem",
    height: "1.5rem",
    borderRadius: "var(--corner-full)",
  },
  boneAction: {
    width: "4.75rem",
    height: "var(--control-height)",
    borderRadius: "var(--corner-md)",
    marginInlineStart: "auto",
  },
  stack: {
    display: "grid",
    gap: "0.25rem",
    minWidth: 0,
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.375rem",
  },
  table: {
    minWidth: "48rem",
  },
  reason: {
    maxWidth: "28rem",
    overflowWrap: "anywhere",
  },
  muted: {
    color: colors.mutedForeground,
  },
  dialogFields: {
    display: "grid",
    gap: "1rem",
    paddingBlock: "1rem",
  },
  fieldRow: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: { default: "1fr", [media.sm]: "1fr 1fr" },
  },
});
