import * as stylex from "@stylexjs/stylex";
import { typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  day: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  dayHeading: {
    color: colors.mutedForeground,
  },
  dayList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  toolbar: {
    containerType: "inline-size",
  },
  toolbarContent: {
    display: "flex",
    flexDirection: {
      default: "column",
      "@container (min-width: 48rem)": "row",
    },
    alignItems: {
      default: null,
      "@container (min-width: 48rem)": "center",
    },
    gap: {
      default: "1rem",
      "@container (min-width: 48rem)": "1rem",
    },
    columnGap: {
      default: null,
      "@container (min-width: 48rem)": "1rem",
    },
    rowGap: {
      default: null,
      "@container (min-width: 48rem)": "0.5rem",
    },
    paddingInline: "1rem",
    paddingTop: "0.75rem",
    paddingBottom: "0.75rem",
  },
  views: {
    display: {
      default: "grid",
      "@container (min-width: 36rem)": "flex",
    },
    minWidth: 0,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    flexWrap: {
      default: null,
      "@container (min-width: 36rem)": "wrap",
    },
    gap: "0.5rem",
  },
  viewPill: {
    width: {
      default: "100%",
      "@container (min-width: 36rem)": "auto",
    },
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    borderRadius: "var(--corner-lg)",
    borderColor: {
      default: colors.borderStrong,
      ":is([data-checked])": "transparent",
    },
    paddingInline: "1rem",
    fontWeight: 600,
    backgroundColor: {
      default: null,
      ":is([data-checked])": colors.primary,
      ":is([data-checked]):hover": colors.primaryHover,
    },
    color: {
      default: null,
      ":is([data-checked])": colors.primaryForeground,
    },
  },
  separator: {
    display: {
      default: "none",
      "@container (min-width: 48rem)": "block",
    },
    height: "2rem",
  },
  toolbarEnd: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  sortTrigger: {
    width: "max-content",
    minWidth: "10rem",
    maxWidth: "100%",
  },
  count: {
    flexShrink: 0,
    fontWeight: 500,
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    color: colors.mutedForeground,
  },
  empty: {
    minHeight: 0,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
  skeletonStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  skeleton: {
    height: "9rem",
  },
  error: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
});

export const listTypography = {
  caption: typography.caption,
  label: typography.label,
};
