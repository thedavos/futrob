import * as stylex from "@stylexjs/stylex";

/** Shared geometry for organization home data layout and its loading skeleton. */
export const organizationHomeLayout = stylex.create({
  stack: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
  card: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1.25rem",
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    flexShrink: 0,
    textDecorationLine: "none",
    fontWeight: "var(--font-weight-medium)",
  },
  chevron: {
    width: "1rem",
    height: "1rem",
  },
  tableContent: {
    padding: 0,
  },
  activityContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingTop: 0,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  bodyCell: {
    height: "auto",
    paddingBlock: "1rem",
  },
  alignCenter: {
    textAlign: "center",
  },
  identity: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    gap: "0.75rem",
  },
  cover: {
    display: "block",
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
    objectFit: "contain",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.125rem",
  },
});
