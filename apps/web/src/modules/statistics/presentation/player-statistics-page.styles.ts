import * as stylex from "@stylexjs/stylex";
import { typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
export const styles = stylex.create({
  main: {
    width: "100%",
  },
  identity: {
    gridColumnStart: 1,
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "1rem",
  },
  avatar: {
    width: "3.5rem",
    height: "3.5rem",
  },
  identityCopy: {
    minWidth: 0,
  },
  error: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  ready: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  evolution: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
  evolutionList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  loadingGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
  },
  skeletonStat: {
    height: "5rem",
  },
  skeletonChart: {
    height: "18rem",
  },
});

export const pageTypography = {
  caption: typography.caption,
  label: typography.label,
};
