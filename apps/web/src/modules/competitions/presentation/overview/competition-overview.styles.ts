import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

/** Shared geometry for the organizer overview data layout and its loading skeleton. */
export const overviewLayout = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
  layout: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 2fr) minmax(0, 1fr)",
    },
    gap: "1rem",
    alignItems: "start",
  },
  column: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem 1rem",
    marginBottom: 0,
  },
  headerActions: {
    gridColumnStart: "auto",
    gridRowStart: "auto",
    gridRowEnd: "auto",
    justifyContent: "flex-start",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    alignItems: "center",
    gap: "0.875rem",
  },
  identityCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  titleRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 0.625rem",
    minWidth: 0,
  },
  coverFrame: {
    display: "flex",
    width: "3rem",
    height: "3rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.25rem",
  },
  progressPanel: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    paddingBlock: "0.875rem",
    paddingInline: "1.25rem",
  },
});
