import * as stylex from "@stylexjs/stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const teamsStyles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space.s5,
    minWidth: 0,
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s3,
  },
  searchBox: {
    width: { default: "100%", [media.sm]: "16rem" },
  },
  grid: {
    display: "grid",
    gap: space.s4,
    margin: 0,
    padding: 0,
    listStyle: "none",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(3, minmax(0, 1fr))",
    },
  },
  card: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: space.s4,
    flexGrow: 1,
    padding: space.s4,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s3,
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: space.s3,
    minWidth: 0,
  },
  crest: {
    width: "2.25rem",
    height: "2.25rem",
    flexShrink: 0,
  },
  teamName: {
    overflowWrap: "anywhere",
    minWidth: 0,
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s2,
  },
  recordCopy: {
    display: "flex",
    alignItems: "baseline",
    gap: space.s2,
    fontVariantNumeric: "tabular-nums",
  },
  pointsStrong: {
    color: colors.foreground,
    fontWeight: "var(--font-weight-semibold)",
  },
  cardFoot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: "auto",
    paddingTop: space.s2,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  calendarLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: colors.primary,
    fontWeight: "var(--font-weight-medium)",
    textDecoration: "none",
  },
});
