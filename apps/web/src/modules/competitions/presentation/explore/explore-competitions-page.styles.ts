import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
  },
  breadcrumb: {
    marginBottom: "1rem",
  },
  body: {
    marginTop: "1rem",
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "1.5rem",
  },
  toolbar: {
    containerType: "inline-size",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  toolbarRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "1rem",
    rowGap: "0.75rem",
  },
  search: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "16rem",
    minWidth: 0,
    maxWidth: {
      default: null,
      "@container (min-width: 40rem)": "24rem",
    },
  },
  filters: {
    display: {
      default: "grid",
      "@container (min-width: 40rem)": "flex",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 30rem)": "repeat(2, minmax(0, 1fr))",
    },
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
    minWidth: 0,
    width: {
      default: "100%",
      "@container (min-width: 40rem)": "auto",
    },
  },
  filter: {
    whiteSpace: "nowrap",
    width: {
      default: "100%",
      "@container (min-width: 40rem)": "max-content",
    },
    minWidth: {
      default: 0,
      "@container (min-width: 40rem)": "10rem",
    },
    maxWidth: "100%",
  },
  count: {
    color: colors.mutedForeground,
    marginInlineStart: {
      default: 0,
      "@container (min-width: 40rem)": "auto",
    },
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(3, minmax(0, 1fr))",
    },
    gap: "1rem",
  },
  more: {
    alignSelf: "center",
  },
  card: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    height: "100%",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  mark: {
    width: "3rem",
    height: "3rem",
    flexShrink: 0,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    objectFit: "cover",
  },
  cardCopy: {
    display: "grid",
    minWidth: 0,
    flexGrow: 1,
    gap: "0.25rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  org: {
    color: colors.mutedForeground,
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
    marginTop: "auto",
  },
  facts: {
    display: "grid",
    gap: "0.5rem",
    margin: 0,
    paddingInlineStart: 0,
    listStyle: "none",
  },
  fact: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
    color: colors.mutedForeground,
    fontVariantNumeric: "tabular-nums",
  },
  factIcon: {
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  view: {
    flexGrow: 1,
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
  },
  participating: {
    color: colors.mutedForeground,
  },
  skeletonCard: {
    display: "flex",
    minHeight: "12rem",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "1.5rem",
  },
  skeletonTitle: {
    width: "70%",
    height: "1.25rem",
  },
  skeletonLine: {
    width: "50%",
    height: "0.875rem",
  },
  skeletonMeta: {
    width: "85%",
    height: "0.75rem",
  },
  skeletonAction: {
    width: "8rem",
    height: "2.5rem",
    marginTop: "auto",
  },
  skeletonCount: {
    width: "8rem",
    height: "0.875rem",
    marginInlineStart: "auto",
  },
  error: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  empty: {
    flexGrow: 1,
  },
  detailList: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
    gap: "1rem",
  },
  detailItem: {
    display: "grid",
    gap: "0.25rem",
    minWidth: 0,
  },
  detailTerm: {
    color: colors.mutedForeground,
  },
  applySection: {
    marginTop: "2rem",
  },
  applyForm: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "0.75rem",
  },
  applyField: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "16rem",
    minWidth: 0,
    maxWidth: "28rem",
  },
  applyError: {
    marginTop: "0.75rem",
    color: colors.danger,
  },
  detailActions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
  },
});
