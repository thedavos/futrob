import * as stylex from "@stylexjs/stylex";
import { typography, vis } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
export const styles = stylex.create({
  main: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  scoreboard: {
    margin: 0,
    listStyle: "none",
    padding: 0,
  },
  skeletonBoard: {
    minHeight: "13rem",
    width: "100%",
    borderRadius: "var(--corner-xl)",
  },
  error: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  tabs: {
    width: "fit-content",
    maxWidth: "100%",
  },
  panel: {
    paddingTop: "1.5rem",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
  loadingSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  skeletonTitle: {
    height: "2.5rem",
    width: "12rem",
    maxWidth: "100%",
  },
  skeletonBody: {
    height: "11rem",
    width: "100%",
  },
  empty: {
    minHeight: 0,
  },
});

export const detailTypography = {
  caption: typography.caption,
};

export const detailVis = {
  srOnly: vis.srOnly,
};
