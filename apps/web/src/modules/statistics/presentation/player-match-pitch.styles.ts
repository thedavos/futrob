import * as stylex from "@stylexjs/stylex";
import { colors, media } from "@futrob/ui/styles/public.stylex";

export const styles = stylex.create({
  root: {
    pointerEvents: "none",
    position: "absolute",
    inset: 0,
  },
  half: {
    position: "absolute",
    inset: 0,
    perspective: "800px",
  },
  halfHome: {
    clipPath: "polygon(0 0, 58% 0, 42% 100%, 0 100%)",
  },
  halfAway: {
    clipPath: "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)",
  },
  washWin: {
    backgroundColor: "color-mix(in oklab, var(--primary) 10%, transparent)",
  },
  washLoss: {
    backgroundColor: "color-mix(in oklab, var(--danger) 10%, transparent)",
  },
  washDrawHome: {
    backgroundColor: colors.muted,
  },
  washDrawAway: {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  watermark: {
    position: "absolute",
    top: "50%",
    display: {
      default: "none",
      [media.lg]: "block",
    },
    width: "16.1rem",
    height: "16.1rem",
    maxWidth: "none",
    objectFit: "contain",
    opacity: 0.1,
    outlineWidth: 0,
    outlineStyle: "none",
    filter: "grayscale(1)",
    mixBlendMode: {
      default: "multiply",
      ":is(.dark *)": "soft-light",
      ':is([data-theme="dark"] *)': "soft-light",
    },
  },
  watermarkHome: {
    left: "20%",
    transformOrigin: "left",
    transform: "translate(-50%, -50%) rotateY(60deg)",
  },
  watermarkAway: {
    left: "80%",
    transformOrigin: "right",
    transform: "translate(-50%, -50%) rotateY(-60deg)",
  },
});
