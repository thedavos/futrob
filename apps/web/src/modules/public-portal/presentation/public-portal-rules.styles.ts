import * as stylex from "@stylexjs/stylex";
import { space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

export const rulesStyles = stylex.create({
  columns: {
    display: "grid",
    gap: space.s5,
    alignItems: "start",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 1.4fr) minmax(0, 1fr)",
    },
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: space.s5,
    padding: space.s5,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
  },
  sectionHead: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s2,
  },
});
