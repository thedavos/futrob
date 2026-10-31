import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.25rem 0.75rem",
    margin: 0,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  skeleton: {
    width: "100%",
    minHeight: "3rem",
    borderRadius: "var(--corner-lg)",
  },
  headPosition: {
    width: "3.5rem",
    paddingInline: { default: "0.5rem", [media.sm]: "0.75rem" },
    whiteSpace: "nowrap",
  },
  headTeam: {
    minWidth: "8rem",
  },
  numeric: {
    paddingInline: { default: "0.5rem", [media.sm]: "0.75rem" },
  },
  /** Points rank the table, so they are the only bold figure in the row. */
  points: {
    fontWeight: "var(--font-weight-bold)",
  },
  secondary: {
    display: { default: "none", [media.sm]: "table-cell" },
  },
  position: {
    whiteSpace: "nowrap",
    paddingInline: { default: "0.5rem", [media.sm]: "0.75rem" },
  },
  teamCell: {
    minWidth: 0,
    overflowWrap: "anywhere",
  },
  teamName: {
    display: "block",
    fontWeight: "var(--font-weight-semibold)",
    color: colors.foreground,
  },
  teamUnresolved: {
    display: "block",
    fontWeight: "var(--font-weight-medium)",
    color: colors.mutedForeground,
  },
  teamSkeleton: {
    display: "block",
    width: "7rem",
    maxWidth: "100%",
    height: "1rem",
  },
  headForm: {
    whiteSpace: "nowrap",
  },
  formCell: {
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  form: {
    display: "inline-flex",
    gap: "0.1875rem",
    verticalAlign: "middle",
  },
  formNarrow: {
    display: { default: "flex", [media.sm]: "none" },
    marginTop: "0.375rem",
  },
  formResult: {
    display: "inline-grid",
    placeItems: "center",
    width: "1.25rem",
    height: "1.25rem",
    borderRadius: "0.3125rem",
    fontSize: "0.6875rem",
    lineHeight: 1,
    fontWeight: 700,
  },
  formWin: {
    backgroundColor: colors.success,
    color: colors.successForeground,
  },
  formDraw: {
    backgroundColor: colors.warning,
    color: colors.warningForeground,
  },
  formLoss: {
    backgroundColor: colors.danger,
    color: colors.dangerForeground,
  },
  formEmpty: {
    display: "inline-block",
    width: "1.25rem",
    height: "1.25rem",
    borderRadius: "0.3125rem",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  leader: {
    color: colors.primary,
    fontWeight: 700,
  },
  points: {
    fontSize: "1rem",
    fontWeight: 700,
  },
  belowCut: {
    borderTopWidth: 1,
    borderTopStyle: "dashed",
    borderTopColor: colors.primary,
  },
  cutNote: {
    color: colors.primary,
  },
  record: {
    display: { default: "block", [media.sm]: "none" },
    marginTop: "0.125rem",
    color: colors.mutedForeground,
  },
});
