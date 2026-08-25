import * as stylex from "@stylexjs/stylex";

export const textWeight = stylex.create({
  regular: { fontWeight: "var(--font-weight-regular)" },
  medium: { fontWeight: "var(--font-weight-medium)" },
  semibold: { fontWeight: "var(--font-weight-semibold)" },
  bold: { fontWeight: "var(--font-weight-bold)" },
});

export type TextWeight = keyof typeof textWeight;
