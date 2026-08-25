import * as stylex from "@stylexjs/stylex";
import { colors, media } from "@futrob/ui/styles/public.stylex";

export const styles = stylex.create({
  root: {
    display: "grid",
    width: "100%",
    gap: "1.5rem",
  },
  search: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "minmax(0, 1fr) auto",
    },
    alignItems: {
      default: null,
      [media.sm]: "end",
    },
  },
  fieldGap: {
    gap: "0.75rem",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: {
      default: "100%",
      [media.sm]: null,
    },
  },
  platformTrigger: {
    width: {
      default: "var(--control-height)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    height: {
      default: "var(--control-height)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    flexShrink: 0,
    cursor: "pointer",
    justifyContent: "center",
    gap: 0,
    borderColor: colors.borderStrong,
    padding: 0,
  },
  logo: {
    width: "1rem",
    height: "1rem",
  },
  platformMenu: {
    minWidth: "13rem",
  },
  platformOption: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  searchButton: {
    minWidth: 0,
    flexGrow: {
      default: 1,
      [media.sm]: 0,
    },
    flexShrink: {
      default: 1,
      [media.sm]: 0,
    },
    flexBasis: {
      default: "0%",
      [media.sm]: "auto",
    },
  },
  status: {
    minHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  results: {
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  resultItem: {
    minHeight: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    paddingTop: "0.75rem",
    paddingBottom: "0.75rem",
    paddingRight: "3.5rem",
    paddingLeft: "0.75rem",
    textAlign: "left",
  },
  crest: {
    width: "3rem",
    height: "3rem",
    outlineWidth: 1,
    outlineStyle: "solid",
    outlineOffset: -1,
    outlineColor: "color-mix(in oklab, var(--foreground) 10%, transparent)",
  },
  fallback: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  resultCopy: {
    display: "grid",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    gap: "0.5rem",
    textAlign: "left",
  },
  resultName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  selected: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingInline: "0.75rem",
    paddingBlock: "0.75rem",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  chipIcon: {
    width: "0.875rem",
    height: "0.875rem",
  },
});
