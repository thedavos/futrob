import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

/** Bones sized to the Agenda toolbar, filters and schedule they reserve. */
export const bones = stylex.create({
  inert: {
    pointerEvents: "none",
  },
  /** Match the ready toolbar wrap: filters sit on their own row below `sm`. */
  controls: {
    flexBasis: { default: "100%", [media.sm]: "auto" },
  },
  tabsList: {
    display: "inline-flex",
    width: "fit-content",
    maxWidth: "100%",
    height: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: 3,
  },
  tab: {
    display: "inline-flex",
    height: "100%",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
    paddingInline: "0.5rem",
    paddingBlock: "0.25rem",
    borderRadius: "var(--corner-md)",
    color: colors.mutedForeground,
    whiteSpace: "nowrap",
  },
  tabActive: {
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  tabMonth: {
    display: { default: "none", [media.md]: "inline-flex" },
  },
  tabIcon: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
  filter: {
    width: "100%",
    height: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    borderRadius: "var(--corner-md)",
  },
  summary: {
    width: "14rem",
    maxWidth: "100%",
    height: "1rem",
  },
  zone: {
    width: "11rem",
    maxWidth: "100%",
    height: "1rem",
  },
  stampFill: {
    width: "1.75rem",
    height: "1.75rem",
    borderRadius: "var(--corner-sm)",
  },
  dayTitle: {
    width: "12rem",
    maxWidth: "100%",
    height: "1.25rem",
  },
  dayMeta: {
    width: "16rem",
    maxWidth: "100%",
    height: "0.75rem",
  },
  time: {
    width: "2.75rem",
    height: "1rem",
  },
  sideHome: {
    width: "7.5rem",
    maxWidth: "100%",
    height: "1rem",
    justifySelf: { default: null, [media.md]: "end" },
  },
  versus: {
    width: "2.25rem",
    height: "1.125rem",
  },
  sideAway: {
    width: "7.5rem",
    maxWidth: "100%",
    height: "1rem",
  },
  chevron: {
    width: "1rem",
    height: "1rem",
    justifySelf: "end",
  },
  indexTitle: {
    width: "5.5rem",
    height: "1.25rem",
  },
  indexStage: {
    width: "3.5rem",
    height: "0.75rem",
  },
  indexLabel: {
    width: "5rem",
    height: "0.75rem",
  },
  indexDate: {
    width: "2.25rem",
    height: "0.75rem",
    flexShrink: 0,
  },
});
