import * as stylex from "@stylexjs/stylex";

export const styles = stylex.create({
  player: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  avatar: {
    width: "2rem",
    height: "2rem",
  },
  playerName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
});
