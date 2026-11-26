import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

/** Shared geometry for the organization competitions list and its loading skeleton. */
export const styles = stylex.create({
  main: {
    width: "100%",
    minWidth: 0,
  },
  body: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  list: {
    overflow: "hidden",
    margin: 0,
    padding: 0,
    listStyleType: "none",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  item: {
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  row: {
    display: "flex",
    minHeight: "var(--control-height)",
    alignItems: "center",
    gap: "1rem",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    transitionProperty: "background-color, color, border-color",
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-standard)",
    backgroundColor: {
      default: null,
      ":hover": "color-mix(in oklab, var(--muted) 40%, transparent)",
    },
  },
  copy: {
    display: "grid",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    gap: "0.25rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  meta: {
    color: colors.mutedForeground,
  },
  nameLine: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    height: "calc(var(--typo-body-size) * var(--typo-body-leading))",
  },
  metaLine: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    height: "calc(var(--typo-caption-size) * var(--typo-caption-leading))",
  },
  nameBone: {
    width: "min(14rem, 100%)",
    height: "1.25rem",
  },
  metaBone: {
    width: "min(5rem, 70%)",
    height: "0.75rem",
  },
  badgeBone: {
    width: "6.5rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
});
