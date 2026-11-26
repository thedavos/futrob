import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

/** Bones sized to the data-state blocks they reserve. */
export const overviewSkeleton = stylex.create({
  title: {
    width: "16rem",
    maxWidth: "100%",
    height: "2rem",
  },
  badge: {
    width: "5.5rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  meta: {
    width: "22rem",
    maxWidth: "100%",
    height: "1rem",
  },
  portalButton: {
    width: "11.25rem",
    maxWidth: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-md)",
  },
  cover: {
    width: "100%",
    height: "100%",
    borderRadius: "var(--corner-md)",
  },
  progress: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "0.75rem",
    rowGap: "0.5rem",
  },
  progressLabel: {
    width: "100%",
    maxWidth: "24rem",
    height: "1rem",
  },
  progressValue: {
    width: "2.5rem",
    height: "1rem",
  },
  progressTrack: {
    gridColumn: "1 / -1",
    width: "100%",
    height: "0.375rem",
    borderRadius: "var(--corner-full)",
  },
  viewAll: {
    width: "4.75rem",
    height: "1rem",
    flexShrink: 0,
  },
  tableCell: {
    height: "auto",
    paddingBlock: "0.75rem",
  },
  teamName: {
    width: "8rem",
    maxWidth: "100%",
    height: "1rem",
  },
  eaClub: {
    width: "7rem",
    maxWidth: "100%",
    height: "1rem",
  },
  roster: {
    width: "2.5rem",
    height: "1rem",
    marginInlineStart: "auto",
  },
  status: {
    width: "4.5rem",
    height: "1.5rem",
    borderRadius: "var(--corner-full)",
    marginInlineStart: "auto",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  rowItem: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "color-mix(in oklab, var(--border) 60%, transparent)",
    ":last-child": {
      borderBottomWidth: 0,
    },
  },
  encounterRow: {
    display: "flex",
    minHeight: "2.75rem",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingBlock: "0.5rem",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "0.125rem",
  },
  encounterTitle: {
    width: "12rem",
    maxWidth: "100%",
    height: "1rem",
  },
  encounterSubtitle: {
    width: "8rem",
    maxWidth: "70%",
    height: "0.75rem",
  },
  officialEnd: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  score: {
    width: "2.75rem",
    height: "1.5rem",
    borderRadius: "var(--corner-md)",
  },
  pendingRow: {
    display: "flex",
    minHeight: "2.75rem",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
    paddingBlock: "0.5rem",
  },
  pendingIcon: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  pendingTitle: {
    width: "14rem",
    maxWidth: "100%",
    height: "1rem",
  },
  pendingSubtitle: {
    width: "9rem",
    maxWidth: "80%",
    height: "0.75rem",
  },
  switchBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  switchRow: {
    display: "flex",
    minHeight: "2.75rem",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  switchLabel: {
    width: "9rem",
    maxWidth: "70%",
    height: "1rem",
  },
  switchControl: {
    width: "2.75rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  description: {
    width: "100%",
    height: "2rem",
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
  },
  metaList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    margin: 0,
  },
  metaRow: {
    display: "flex",
    minHeight: "1.75rem",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  metaTerm: {
    width: "6.5rem",
    height: "0.75rem",
  },
  metaValue: {
    width: "5.5rem",
    height: "0.75rem",
  },
});
