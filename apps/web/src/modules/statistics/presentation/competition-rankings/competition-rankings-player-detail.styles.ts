import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  aside: {
    position: "sticky",
    top: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
    padding: "1.25rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
  },
  asideHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: 0,
  },
  prompt: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.5rem",
    color: colors.mutedForeground,
  },
  promptIcon: {
    width: "2rem",
    height: "2rem",
  },
  promptTitle: {
    color: colors.foreground,
  },
  name: {
    overflowWrap: "anywhere",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    minWidth: 0,
  },
  sheet: {
    borderTopLeftRadius: "var(--corner-xl)",
    borderTopRightRadius: "var(--corner-xl)",
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  dialog: {
    maxWidth: "28rem",
  },
  dialogBody: {
    marginTop: "1.25rem",
  },
  facts: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "1rem",
    margin: 0,
  },
  fact: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: 0,
  },
  factTerm: {
    color: colors.mutedForeground,
  },
  factValue: {
    margin: 0,
    fontSize: "1.25rem",
    lineHeight: 1.2,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: colors.foreground,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.mutedForeground,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "1rem",
    minHeight: "2.75rem",
    paddingBlock: "0.5rem",
    paddingInline: "0.75rem",
    borderRadius: "var(--corner-md)",
  },
  itemCurrent: {
    backgroundColor: colors.accent,
  },
  currentBar: {
    position: "absolute",
    insetInlineStart: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  itemCopy: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
    minWidth: 0,
  },
  kindLabel: {
    fontWeight: 500,
    color: colors.foreground,
  },
  kindLabelCurrent: {
    fontWeight: 600,
  },
  itemFigure: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.125rem",
    textAlign: "end",
    whiteSpace: "nowrap",
  },
  value: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
    color: colors.foreground,
  },
  valueMuted: {
    fontWeight: 500,
    color: colors.mutedForeground,
  },
});
