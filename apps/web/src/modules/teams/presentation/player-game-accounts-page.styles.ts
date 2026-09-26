import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

export const styles = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
    containerType: "inline-size",
  },
  alert: {
    marginBottom: "1rem",
  },
  stack: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "1rem",
  },
  setupIdle: {
    display: "flex",
    minWidth: 0,
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2rem",
    paddingBlock: "2rem",
    textAlign: "center",
  },
  setupCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    maxWidth: "24rem",
  },
  setupTitle: {
    fontSize: "var(--text-lg)",
    lineHeight: "1.75rem",
    fontWeight: "var(--font-weight-bold)",
  },
  setupSubtitle: {
    fontWeight: "var(--font-weight-medium)",
  },
  setupHint: {
    fontWeight: "var(--font-weight-medium)",
  },
  setupStepper: {
    width: "100%",
    maxWidth: "22rem",
  },
  setupGamepad: {
    display: "block",
    width: {
      default: "14rem",
      "@container (min-width: 28rem)": "16rem",
    },
    height: "auto",
    flexShrink: 0,
    objectFit: "contain",
  },
  setupActive: {
    display: "flex",
    minWidth: 0,
    minHeight: {
      default: "24rem",
      "@container (min-width: 44rem)": "26rem",
    },
    flexDirection: "column",
  },
  setupContentActive: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    flexGrow: 1,
    gap: "1.5rem",
    minWidth: 0,
    paddingTop: "1.25rem",
    paddingBottom: "1.25rem",
    textAlign: "center",
  },
  setupChrome: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    minWidth: 0,
    maxWidth: "100%",
  },
  setupGamepadCompact: {
    display: "block",
    width: "3.5rem",
    height: "auto",
    flexShrink: 0,
    objectFit: "contain",
  },
  setupBody: {
    display: "grid",
    width: "100%",
    maxWidth: "42rem",
    gap: "1.5rem",
    minWidth: 0,
    textAlign: "start",
  },
  setupFieldset: {
    margin: 0,
    borderWidth: 0,
    padding: 0,
  },
  setupLegend: {
    marginBottom: "0.75rem",
  },
  setupPlatformGrid: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
      [media.lg]: "repeat(5, minmax(0, 1fr))",
    },
  },
  setupFieldGap: {
    gap: "0.75rem",
  },
  setupActions: {
    display: "flex",
    width: "100%",
    maxWidth: "42rem",
    flexDirection: {
      default: "column",
      [media.sm]: "row-reverse",
    },
    alignItems: {
      default: "stretch",
      [media.sm]: "center",
    },
    justifyContent: {
      default: null,
      [media.sm]: "space-between",
    },
    gap: {
      default: "0.5rem",
      [media.sm]: "1rem",
    },
  },
  setupPrimary: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
    minWidth: {
      default: null,
      [media.sm]: "10rem",
    },
  },
  setupSecondary: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
  },
  board: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  identifierCard: {
    containerType: "inline-size",
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
  },
  clubsRow: {
    display: "grid",
    gap: "1.5rem",
    alignItems: "stretch",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 44rem)": "minmax(0, 2fr) minmax(0, 1fr)",
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
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1.25rem",
  },
  headerCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
    flexGrow: 1,
  },
  headerAction: {
    flexShrink: 0,
    marginLeft: "auto",
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
    minHeight: 0,
    paddingTop: 0,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  identifierContent: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    paddingTop: "1rem",
    paddingBottom: "1rem",
    paddingInline: "1.5rem",
  },
  identifierBar: {
    display: "grid",
    gridTemplateColumns: "auto auto auto minmax(0, 1fr)",
    alignItems: "center",
    columnGap: "1rem",
    minWidth: 0,
  },
  identifierCluster: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    minWidth: 0,
  },
  gamepad: {
    display: "block",
    width: "4rem",
    height: "auto",
    flexShrink: 0,
    objectFit: "contain",
  },
  metaColumn: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    minWidth: 0,
  },
  identifierDivider: {
    alignSelf: "center",
    height: "2rem",
  },
  metaCluster: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    minWidth: 0,
  },
  platformLogo: {
    display: "block",
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
    color: colors.foreground,
  },
  editLink: {
    justifySelf: "end",
    minWidth: 0,
  },
  clubScroll: {
    minHeight: "8.5rem",
    height: "16rem",
    maxHeight: "16rem",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
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
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingInline: "0.75rem",
    paddingBlock: "0.5rem",
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  crest: {
    width: "2.75rem",
    height: "2.75rem",
    flexShrink: 0,
  },
  clubIdentity: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.125rem",
  },
  clubName: {
    minWidth: 0,
  },
  clubMeta: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.375rem",
  },
  clubMetaText: {
    minWidth: 0,
    flexShrink: 1,
  },
  clubMetaDot: {
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  clubMetaLogo: {
    display: "block",
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  rowAction: {
    gridColumn: {
      default: "1 / -1",
      "@container (min-width: 20rem)": "auto",
    },
    justifySelf: "end",
    minWidth: 0,
  },
  changeClub: {
    fontSize: "var(--text-xs)",
  },
  spinner: {
    animationName: spin,
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});
