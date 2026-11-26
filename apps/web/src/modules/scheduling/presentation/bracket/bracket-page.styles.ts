import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

/** Height of the round headings above the cards, inside the scrollable canvas. */
export const BRACKET_HEADINGS_HEIGHT = 64;

export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    minWidth: 0,
  },
  tabs: {
    gap: "1.5rem",
    minWidth: 0,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem 1rem",
    minWidth: 0,
  },
  toolbarStart: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem 1rem",
    minWidth: 0,
  },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  filter: {
    flexGrow: { default: 1, [media.sm]: 0 },
    flexShrink: { default: 1, [media.sm]: 0 },
    flexBasis: { default: "100%", [media.sm]: "15rem" },
    minWidth: 0,
  },
  filterTrigger: {
    width: "100%",
    minWidth: 0,
  },
  filterSummary: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 1rem",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    minWidth: 0,
  },
  stage: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    minWidth: 0,
  },
  stageHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 1rem",
  },
  facts: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  scroller: {
    overflowX: "auto",
    overflowY: "hidden",
    overscrollBehaviorX: "contain",
    paddingBlock: "1rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    scrollbarColor: "var(--border) transparent",
    outlineColor: colors.ring,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    outlineOffset: 2,
  },
  canvas: {
    position: "relative",
    marginInline: "auto",
  },
  canvasSize: (width: string, height: string) => ({ width, height }),
  column: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  columnHeading: {
    position: "absolute",
    top: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  at: (left: string, top: string) => ({ left, top }),
  nodeWidth: (width: string) => ({ width }),
  wires: {
    position: "absolute",
    left: 0,
    pointerEvents: "none",
    overflow: "visible",
  },
  wire: {
    fill: "none",
    stroke: colors.borderStrong,
    strokeWidth: 1.5,
  },
  /** A winner place still open: the line says where it leads, dashed until a Team fills it. */
  wirePending: {
    stroke: colors.border,
    strokeDasharray: "4 4",
  },
  /** The followed Team's path through the draw: an active selection, so lima. */
  wireFollowed: {
    stroke: colors.primary,
    strokeWidth: 2,
  },
  wireQuiet: {
    stroke: colors.border,
  },
  node: {
    position: "absolute",
    transform: "translateY(-50%)",
  },
  /**
   * Fixed rows so lines meet the home and away rows: 2rem header, 2.25rem per side and a
   * 2rem footer add up to `BRACKET_GEOMETRY.nodeHeight`, and each side's centre sits
   * `sideOffset` from the card's centre.
   */
  card: {
    display: "grid",
    gridTemplateRows: "2rem 2.25rem 2.25rem 2rem",
    height: "8.5rem",
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.border, ":hover": colors.borderStrong },
    borderRadius: "var(--corner-xl)",
    backgroundColor: { default: colors.surface, ":hover": colors.surfaceRaised },
    color: "inherit",
    textDecoration: "none",
    outlineColor: colors.ring,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    outlineOffset: 2,
    transitionProperty: "background-color, border-color",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
  },
  /** Outside the Team filter: still opaque so lines never show through, only quieter. */
  cardDimmed: {
    borderStyle: "dashed",
    backgroundColor: { default: colors.background, ":hover": colors.surface },
    color: colors.mutedForeground,
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    paddingInline: "0.75rem",
    minWidth: 0,
  },
  sideRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "0.5rem",
    paddingInline: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    minWidth: 0,
  },
  sideRowFollowed: {
    boxShadow: "inset 3px 0 0 var(--primary)",
  },
  scoreCell: {
    display: "inline-flex",
    alignItems: "baseline",
    justifyContent: "flex-end",
    gap: "0.25rem",
    minWidth: "1.75rem",
    fontVariantNumeric: "tabular-nums",
    fontWeight: "var(--font-weight-semibold)",
    color: colors.foreground,
    whiteSpace: "nowrap",
  },
  scoreLeader: {
    color: colors.primary,
  },
  /** Eliminated: tertiary text, never opacity. */
  scoreOut: {
    color: colors.textTertiary,
  },
  scoreLegs: {
    fontSize: "var(--typo-caption-size)",
    fontWeight: "var(--font-weight-medium)",
    color: colors.textTertiary,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    paddingInline: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    minWidth: 0,
  },
  status: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    minWidth: 0,
    color: colors.mutedForeground,
  },
  statusOfficial: {
    color: colors.approved,
  },
  statusAwaiting: {
    color: colors.warning,
  },
  statusIcon: {
    flexShrink: 0,
    width: "0.875rem",
    height: "0.875rem",
  },
  openIcon: {
    flexShrink: 0,
    width: "1rem",
    height: "1rem",
    color: colors.textTertiary,
  },
  champion: {
    position: "absolute",
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.25rem",
    minHeight: "6.5rem",
    paddingInline: "0.75rem",
    paddingBlock: "0.75rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.surface,
    textAlign: "center",
  },
  championIcon: {
    width: "1.5rem",
    height: "1.5rem",
    color: colors.textTertiary,
  },
  championIconWon: {
    color: colors.emphasis,
  },
  championName: {
    overflowWrap: "anywhere",
  },
  list: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "repeat(2, minmax(0, 1fr))",
      [media.xl]: "repeat(4, minmax(0, 1fr))",
    },
    gap: "1.5rem",
  },
  listRound: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    minWidth: 0,
  },
  listItems: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  listRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    minHeight: "var(--control-height)",
    paddingBlock: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    color: "inherit",
    textDecoration: "none",
    outlineColor: colors.ring,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    outlineOffset: 2,
  },
  listRowSide: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  listRowName: {
    overflowWrap: "anywhere",
    minWidth: 0,
  },
  listRowMeta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.25rem 0.75rem",
  },
  timezone: {
    width: "16rem",
    maxWidth: "100%",
    height: "0.875rem",
  },
  filterLabel: {
    width: "5.5rem",
    height: "0.875rem",
  },
  filterControl: {
    width: "100%",
    height: "var(--control-height)",
  },
  stageTitle: {
    width: "11rem",
    maxWidth: "100%",
    height: "1.75rem",
  },
  fact: {
    width: "6.5rem",
    height: "1.5rem",
    borderRadius: "var(--corner-full)",
  },
  hint: {
    width: "22rem",
    maxWidth: "100%",
    height: "0.875rem",
  },
  columnTitle: {
    width: "8.5rem",
    maxWidth: "100%",
    height: "1.25rem",
  },
  columnMeta: {
    width: "4.5rem",
    height: "0.75rem",
  },
  cardNumber: {
    width: "1.5rem",
    height: "0.75rem",
  },
  cardWhen: {
    width: "4rem",
    height: "0.75rem",
  },
  cardSide: {
    width: "80%",
    height: "1rem",
  },
  cardStatus: {
    width: "7rem",
    height: "0.75rem",
  },
  listToggle: {
    width: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
});
