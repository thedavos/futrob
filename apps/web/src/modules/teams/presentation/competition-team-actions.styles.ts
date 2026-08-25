import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

export const styles = stylex.create({
  fields: {
    marginTop: "1.25rem",
    display: "grid",
    gap: "1rem",
  },
  created: {
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "0.75rem",
  },
  createdLabel: {
    color: colors.mutedForeground,
  },
  createdUrl: {
    marginTop: "0.25rem",
    overflowWrap: "anywhere",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  copy: {
    marginTop: "0.75rem",
  },
  search: {
    marginTop: "1.25rem",
    display: "flex",
    gap: "0.5rem",
  },
  results: {
    marginTop: "1rem",
    display: "grid",
    maxHeight: "18rem",
    gap: "0.5rem",
    overflowY: "auto",
  },
  result: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    padding: "0.75rem",
  },
  resultCopy: {
    minWidth: 0,
  },
  resultName: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  resultMeta: {
    color: colors.mutedForeground,
  },
  searchAlert: {
    marginTop: "1rem",
  },
  searchHint: {
    marginTop: "1rem",
    color: colors.mutedForeground,
  },
  roleTrigger: {
    width: "10rem",
  },
});
