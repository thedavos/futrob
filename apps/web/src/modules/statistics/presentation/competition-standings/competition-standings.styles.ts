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
  tableContainer: {
    borderWidth: 0,
    borderRadius: 0,
  },
  table: {
    borderCollapse: "collapse",
    fontSize: "1rem",
    lineHeight: "1.5rem",
  },
  header: {
    backgroundColor: "transparent",
  },
  headerRow: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  headCell: {
    height: "auto",
    paddingBlock: "0.75rem",
    paddingInline: { default: "0.375rem", [media.sm]: "0.75rem" },
    color: colors.mutedForeground,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  abbr: {
    textDecorationLine: "none",
    cursor: "help",
  },
  headPosition: {
    width: { default: "2rem", [media.sm]: "3rem" },
  },
  headTeam: {
    textAlign: "start",
  },
  headForm: {
    display: { default: "none", [media.sm]: "table-cell" },
    textAlign: "end",
  },
  row: {
    backgroundColor: "transparent",
    borderBottomWidth: { default: 1, ":last-child": 0 },
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  cell: {
    height: "auto",
    paddingBlock: "0.875rem",
    paddingInline: { default: "0.375rem", [media.sm]: "0.75rem" },
    verticalAlign: "middle",
  },
  aboveCut: {
    borderBottomWidth: 1,
    borderBottomStyle: "dashed",
    borderBottomColor: colors.borderStrong,
  },
  numeric: {
    textAlign: "end",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  position: {
    whiteSpace: "nowrap",
  },
  positionValue: {
    color: colors.mutedForeground,
  },
  leader: {
    color: colors.primary,
    fontWeight: 600,
  },
  teamCell: {
    minWidth: 0,
    overflowWrap: "break-word",
    hyphens: "auto",
  },
  team: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  crest: {
    width: "1.75rem",
    height: "1.75rem",
    flexShrink: 0,
  },
  crestPlaceholder: {
    display: "inline-block",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.surfaceRaised,
  },
  teamName: {
    fontWeight: 600,
    color: colors.foreground,
  },
  teamUnresolved: {
    fontWeight: 500,
    color: colors.mutedForeground,
  },
  teamSkeleton: {
    display: "block",
    width: "7rem",
    maxWidth: "100%",
    height: "1rem",
  },
  formCell: {
    display: { default: "none", [media.sm]: "table-cell" },
    textAlign: "end",
    whiteSpace: "nowrap",
  },
  form: {
    display: "inline-flex",
    gap: { default: "0.125rem", [media.sm]: "0.25rem" },
    verticalAlign: "middle",
  },
  formNarrow: {
    display: { default: "flex", [media.sm]: "none" },
    marginTop: "0.5rem",
  },
  formResult: {
    display: "inline-grid",
    placeItems: "center",
    width: { default: "1.125rem", [media.sm]: "1.375rem" },
    height: { default: "1.125rem", [media.sm]: "1.375rem" },
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
    width: { default: "1.125rem", [media.sm]: "1.375rem" },
    height: { default: "1.125rem", [media.sm]: "1.375rem" },
    borderRadius: "0.3125rem",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  figure: {
    color: colors.mutedForeground,
    fontSize: "1rem",
    lineHeight: "1.5rem",
  },
  points: {
    color: colors.foreground,
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: 700,
  },
  cutNote: {
    color: colors.primary,
  },
});
