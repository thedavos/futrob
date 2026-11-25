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
  metaBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem 1rem",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.375rem 0.75rem",
    margin: 0,
  },
  metaSep: {
    color: colors.textTertiary,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    minWidth: 0,
  },
  skeletonKpiGrid: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
    columnGap: "1rem",
    rowGap: "1rem",
  },
  skeletonKpi: {
    width: "100%",
    height: "5.75rem",
    borderRadius: "var(--corner-lg)",
  },
  skeletonList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
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
    fontSize: "0.9375rem",
    lineHeight: "1.45rem",
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
    paddingInline: { default: "0.375rem", [media.sm]: "0.625rem" },
    color: colors.mutedForeground,
    fontWeight: "var(--font-weight-medium)",
    whiteSpace: "nowrap",
  },
  headPoints: {
    color: colors.foreground,
  },
  abbr: {
    textDecorationLine: "none",
    cursor: "help",
  },
  headPosition: {
    width: { default: "2.25rem", [media.sm]: "3rem" },
    paddingLeft: "0.75rem",
  },
  headTeam: {
    textAlign: "start",
  },
  headSecondary: {
    display: { default: "none", [media.md]: "table-cell" },
  },
  headForm: {
    display: { default: "none", [media.sm]: "table-cell" },
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
    paddingInline: { default: "0.375rem", [media.sm]: "0.625rem" },
    verticalAlign: "middle",
  },
  secondaryCell: {
    display: { default: "none", [media.md]: "table-cell" },
  },
  aboveCut: {
    borderBottomWidth: 1,
    borderBottomStyle: "dashed",
    borderBottomColor: colors.borderStrong,
  },
  position: {
    position: "relative",
    paddingLeft: "0.75rem",
    whiteSpace: "nowrap",
  },
  zoneBar: {
    position: "absolute",
    left: 0,
    top: "0.375rem",
    bottom: "0.375rem",
    width: "0.1875rem",
    borderRadius: "var(--corner-xs)",
    backgroundColor: colors.primary,
  },
  positionValue: {
    color: colors.mutedForeground,
  },
  leader: {
    color: colors.primary,
    fontWeight: "var(--font-weight-semibold)",
  },
  teamCell: {
    minWidth: 0,
    // "anywhere" lets a long name shrink the column, so it never pushes points out of view.
    overflowWrap: "anywhere",
    hyphens: "auto",
  },
  team: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  teamCopy: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.25rem 0.5rem",
    minWidth: 0,
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
    fontWeight: "var(--font-weight-semibold)",
    color: colors.foreground,
  },
  teamUnresolved: {
    fontWeight: "var(--font-weight-medium)",
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
  },
  form: {
    display: "inline-flex",
    gap: { default: "0.1875rem", [media.sm]: "0.25rem" },
    verticalAlign: "middle",
  },
  formNarrow: {
    display: { default: "flex", [media.sm]: "none" },
    marginTop: "0.5rem",
  },
  formResult: {
    display: "inline-grid",
    placeItems: "center",
    width: { default: "1.1875rem", [media.sm]: "1.375rem" },
    height: { default: "1.1875rem", [media.sm]: "1.375rem" },
    borderRadius: "0.3125rem",
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: "0.6875rem",
    lineHeight: 1,
    fontWeight: "var(--font-weight-bold)",
  },
  formWin: {
    backgroundColor: colors.approvedSubtle,
    borderColor: "color-mix(in oklab, var(--success) 32%, transparent)",
    color: colors.success,
  },
  formDraw: {
    backgroundColor: "color-mix(in oklab, var(--warning) 14%, transparent)",
    borderColor: "color-mix(in oklab, var(--warning) 32%, transparent)",
    color: colors.warning,
  },
  formLoss: {
    backgroundColor: "color-mix(in oklab, var(--danger) 14%, transparent)",
    borderColor: "color-mix(in oklab, var(--danger) 32%, transparent)",
    color: colors.danger,
  },
  formLatest: {
    borderColor: "currentColor",
  },
  formEmpty: {
    display: "inline-block",
    width: { default: "1.1875rem", [media.sm]: "1.375rem" },
    height: { default: "1.1875rem", [media.sm]: "1.375rem" },
    borderRadius: "0.3125rem",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  figure: {
    color: colors.mutedForeground,
    fontSize: "0.9375rem",
    lineHeight: "1.45rem",
  },
  figurePositive: {
    color: colors.foreground,
    fontSize: "0.9375rem",
    lineHeight: "1.45rem",
  },
  /** Points rank the table, so they are the only bold figure in the row. */
  points: {
    color: colors.foreground,
    fontSize: "1.125rem",
    lineHeight: "1.5rem",
    fontWeight: "var(--font-weight-bold)",
  },
  swissProgress: {
    color: colors.foreground,
  },
  swissFinal: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: colors.foreground,
  },
  swissDetail: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.25rem 0.5rem",
    marginTop: "0.25rem",
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem 1rem",
    paddingTop: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 1rem",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    color: colors.mutedForeground,
  },
  legendBar: {
    display: "inline-block",
    width: "0.1875rem",
    height: "0.75rem",
    borderRadius: "var(--corner-xs)",
    backgroundColor: colors.primary,
  },
  legendDash: {
    display: "inline-block",
    width: "0.875rem",
    height: 0,
    borderTopWidth: 1,
    borderTopStyle: "dashed",
    borderTopColor: colors.borderStrong,
  },
  cutNote: {
    color: colors.foreground,
  },
});
