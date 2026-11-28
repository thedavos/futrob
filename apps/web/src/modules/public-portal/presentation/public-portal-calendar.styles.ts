import * as stylex from "@stylexjs/stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const calendarStyles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.s5,
    minWidth: 0,
  },
  tabs: {
    gap: space.s4,
    minWidth: 0,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s3,
    minWidth: 0,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.s2,
    flexGrow: { default: 1, [media.md]: 0 },
  },
  filterSlot: {
    flexGrow: { default: 1, [media.sm]: 0 },
    minWidth: { default: "9rem", [media.sm]: "10.5rem" },
  },
  filterTrigger: {
    width: "100%",
    minWidth: 0,
  },
  metaBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.375rem 1rem",
  },
  zone: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  zoneIcon: {
    width: "0.875rem",
    height: "0.875rem",
    color: colors.textTertiary,
    flexShrink: 0,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space.s6,
    minWidth: 0,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
    minWidth: 0,
  },
  groupHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.s2,
  },
  dayHeading: {
    textTransform: "capitalize",
  },
});
