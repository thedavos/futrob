import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const nextEncounterFixture = stylex.create({
  row: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "minmax(0, 1fr) auto auto auto minmax(0, 1fr)",
    justifyItems: "center",
    alignItems: "start",
    columnGap: {
      default: "0.5rem",
      [media.md]: "0.75rem",
      [media.lg]: "1.5rem",
    },
    rowGap: "1rem",
  },
  home: {
    gridColumn: 2,
    gridRow: {
      default: 1,
      [media.lg]: "1 / 3",
    },
    minWidth: 0,
  },
  vsCell: {
    gridColumn: 3,
    gridRow: 1,
    paddingTop: {
      default: "2rem",
      [media.md]: "2.5rem",
      [media.lg]: "3rem",
    },
  },
  away: {
    gridColumn: 4,
    gridRow: {
      default: 1,
      [media.lg]: "1 / 3",
    },
    minWidth: 0,
  },
  meta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    gridColumn: {
      default: "1 / -1",
      [media.lg]: 3,
    },
    gridRow: 2,
  },
  club: {
    display: "flex",
    width: {
      default: "6rem",
      [media.md]: "7rem",
      [media.lg]: "8rem",
    },
    minWidth: 0,
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  crest: {
    width: {
      default: "5.5rem",
      [media.md]: "6.5rem",
      [media.lg]: "7.5rem",
    },
    height: {
      default: "5.5rem",
      [media.md]: "6.5rem",
      [media.lg]: "7.5rem",
    },
  },
});
