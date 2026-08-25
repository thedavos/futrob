import * as stylex from "@stylexjs/stylex";

export const textAlign = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
});

export type TextAlign = keyof typeof textAlign;
