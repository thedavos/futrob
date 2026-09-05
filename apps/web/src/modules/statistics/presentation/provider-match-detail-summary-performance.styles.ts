import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  section: {
    display: "flex",
    minWidth: 0,
    height: "100%",
    flexDirection: "column",
    gap: "1rem",
  },
  card: {
    display: "flex",
    minWidth: 0,
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    paddingInline: "1.25rem",
    paddingTop: "1.25rem",
    paddingBottom: "1rem",
  },
  content: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
    justifyContent: "center",
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
    containerType: "inline-size",
  },
  list: {
    display: "grid",
    width: "100%",
    flexGrow: 1,
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      "@container (min-width: 28rem)": "repeat(3, minmax(0, 1fr))",
    },
    alignContent: "center",
    alignItems: "center",
    justifyItems: "center",
    columnGap: "1.25rem",
    rowGap: "1.25rem",
  },
  item: {
    display: "flex",
    minWidth: 0,
    width: "100%",
    justifyContent: "center",
  },
  identityItem: {
    width: "100%",
    maxWidth: "100%",
  },
  identityHeader: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1.5rem",
  },
  itemCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
    textAlign: "start",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  identityCopy: {
    minWidth: 0,
  },
  nameRow: {
    display: "flex",
    minWidth: 0,
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  name: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  stat: {
    flexShrink: 0,
  },
  metricLabel: {
    textWrap: "pretty",
  },
  metricValue: {
    fontSize: "1.75rem",
    lineHeight: 1,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  secondary: {
    textAlign: "start",
    color: colors.mutedForeground,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  pretty: {
    textWrap: "pretty",
  },
  avatar: {
    width: "2.75rem",
    height: "2.75rem",
  },
  ratingGood: {
    color: colors.primary,
  },
  ratingExcellent: {
    color: colors.primary,
  },
});
