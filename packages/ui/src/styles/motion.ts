import * as stylex from "@stylexjs/stylex";

import { media } from "./media.stylex.ts";

const pulse = stylex.keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.5 },
});

export const motion = stylex.create({
  pulse: {
    animationName: {
      default: pulse,
      [media.reduceMotion]: "none",
    },
    animationDuration: {
      default: "2s",
      [media.reduceMotion]: "0ms",
    },
    animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
    animationIterationCount: "infinite",
  },
});
