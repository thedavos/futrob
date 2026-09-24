import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  main: {
    width: "100%",
    containerType: "inline-size",
  },
  alert: {
    marginBottom: "1rem",
  },
  loading: {
    marginBottom: "1rem",
    color: colors.mutedForeground,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  setup: {
    display: "flex",
    minWidth: 0,
    minHeight: {
      default: "28rem",
      "@container (min-width: 44rem)": "32rem",
    },
    flexDirection: "column",
  },
  setupContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    gap: "1.5rem",
    minWidth: 0,
    paddingTop: "1.5rem",
    textAlign: "center",
  },
  setupCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    maxWidth: "24rem",
  },
  setupGamepad: {
    display: "block",
    width: {
      default: "12rem",
      "@container (min-width: 28rem)": "14rem",
    },
    height: "auto",
    flexShrink: 0,
    objectFit: "contain",
  },
  board: {
    display: "grid",
    gap: "1.5rem",
    alignItems: "stretch",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 44rem)": "minmax(0, 1fr) minmax(0, 1fr)",
    },
  },
  large: {
    containerType: "inline-size",
    display: "flex",
    minWidth: 0,
    minHeight: "min-content",
    flexDirection: "column",
    alignSelf: "stretch",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
    padding: "1.25rem",
  },
  title: {
    fontSize: "var(--text-lg)",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: "1rem",
    minWidth: 0,
    paddingTop: 0,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  identityRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    columnGap: "0.75rem",
    minWidth: 0,
  },
  gamepad: {
    display: "block",
    width: {
      default: "6rem",
      "@container (min-width: 20rem)": "7.5rem",
    },
    height: "auto",
    flexShrink: 0,
    objectFit: "contain",
    outlineWidth: 1,
    outlineStyle: "solid",
    outlineColor: "oklch(1 0 0 / 0.1)",
    outlineOffset: -1,
  },
  platformRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    minWidth: 0,
  },
  platformLogo: {
    display: "block",
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
    color: colors.foreground,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "auto minmax(0, 1fr)",
      "@container (min-width: 20rem)": "auto minmax(0, 1fr) auto",
    },
    alignItems: "center",
    columnGap: "0.75rem",
    rowGap: "0.75rem",
    minWidth: 0,
    minHeight: "var(--control-height)",
  },
  crest: {
    width: "2.75rem",
    height: "2.75rem",
    flexShrink: 0,
  },
  clubName: {
    minWidth: 0,
  },
  rowAction: {
    gridColumn: {
      default: "1 / -1",
      "@container (min-width: 20rem)": "auto",
    },
    justifySelf: "end",
    minWidth: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    minWidth: 0,
  },
  primary: {
    minWidth: 0,
    maxWidth: "100%",
    width: {
      default: "100%",
      "@container (min-width: 20rem)": "fit-content",
    },
  },
  eaMark: {
    display: "block",
    width: "1rem",
    height: "1rem",
  },
  spinner: {
    animationName: spin,
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});
