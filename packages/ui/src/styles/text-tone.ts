import * as stylex from "@stylexjs/stylex";

import { colors } from "./tokens.stylex.ts";

export const textTone = stylex.create({
  default: {
    color: colors.foreground,
  },
  muted: {
    color: colors.mutedForeground,
  },
});
