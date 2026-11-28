import * as stylex from "@stylexjs/stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const boneStyles = stylex.create({
  kpiGrid: {
    display: "grid",
    width: "100%",
    gap: space.s4,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  kpiCard: {
    width: "100%",
    height: "5.5rem",
    borderRadius: "var(--corner-lg)",
  },
  coverTopGrid: {
    display: "grid",
    gap: space.s4,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 1.3fr) minmax(0, 1fr)",
    },
  },
  coverHeroBone: {
    width: "100%",
    height: "12.5rem",
    borderRadius: "var(--corner-xl)",
  },
  toolbarRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s3,
  },
  toolbarPillBone: {
    width: "12rem",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
  toolbarFilterBone: {
    width: "11rem",
    height: "var(--control-height-dense)",
    borderRadius: "var(--corner-md)",
  },
  teamsGrid: {
    display: "grid",
    gap: space.s4,
    margin: 0,
    padding: 0,
    listStyle: "none",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(3, minmax(0, 1fr))",
    },
  },
  teamTileBone: {
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
    padding: space.s4,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
  },
  teamTileRow: {
    display: "flex",
    alignItems: "center",
    gap: space.s3,
  },
  crestBone: {
    width: "2.25rem",
    height: "2.25rem",
    borderRadius: "var(--corner-full)",
    flexShrink: 0,
  },
  subLineBone: {
    width: "10rem",
    height: "0.875rem",
  },
});
