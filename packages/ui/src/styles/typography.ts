import * as stylex from "@stylexjs/stylex";

import { media } from "./media.stylex.ts";

/** Canonical type roles. Prefer these over ad-hoc font-size / weight. */
export const typography = stylex.create({
  display: {
    fontSize: {
      default: "var(--typo-display-size)",
      [media.sm]: "var(--text-5xl)",
      [media.lg]: "var(--text-6xl)",
    },
    fontWeight: "var(--typo-display-weight)",
    lineHeight: "var(--typo-display-leading)",
    letterSpacing: "var(--typo-display-tracking)",
    textWrap: "balance",
  },
  heading: {
    fontSize: "var(--typo-heading-size)",
    fontWeight: "var(--typo-heading-weight)",
    lineHeight: "var(--typo-heading-leading)",
    letterSpacing: "var(--typo-heading-tracking)",
    textWrap: "balance",
  },
  subtitle: {
    fontSize: "var(--typo-subtitle-size)",
    fontWeight: "var(--typo-subtitle-weight)",
    lineHeight: "var(--typo-subtitle-leading)",
    letterSpacing: "var(--typo-subtitle-tracking)",
    textWrap: "pretty",
  },
  label: {
    fontSize: "var(--typo-label-size)",
    fontWeight: "var(--typo-label-weight)",
    lineHeight: "var(--typo-label-leading)",
    letterSpacing: "var(--typo-label-tracking)",
  },
  body: {
    fontSize: "var(--typo-body-size)",
    fontWeight: "var(--typo-body-weight)",
    lineHeight: "var(--typo-body-leading)",
    letterSpacing: "var(--typo-body-tracking)",
    textWrap: "pretty",
  },
  caption: {
    fontSize: "var(--typo-caption-size)",
    fontWeight: "var(--typo-caption-weight)",
    lineHeight: "var(--typo-caption-leading)",
    letterSpacing: "var(--typo-caption-tracking)",
    textWrap: "pretty",
  },
  score: {
    fontSize: {
      default: "var(--typo-score-size)",
      [media.sm]: "var(--text-4xl)",
    },
    fontWeight: "var(--typo-score-weight)",
    lineHeight: "var(--typo-score-leading)",
    letterSpacing: "var(--typo-score-tracking)",
    fontVariantNumeric: "tabular-nums",
  },
});
