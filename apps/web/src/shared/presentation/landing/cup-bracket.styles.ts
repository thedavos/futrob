import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";

/**
 * Entrance timeline. Every delay is a multiple of `--duration-fast`, so the sequence ends within
 * 1.5 s and collapses to the final state when reduced motion sets the duration tokens to 0 ms.
 */
const STEP = "var(--duration-fast)";
const DRAW_DURATION = "calc(var(--duration-normal) * 2)";

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const popIn = stylex.keyframes({
  from: { opacity: 0, scale: 0.8 },
  to: { opacity: 1, scale: 1 },
});

const riseIn = stylex.keyframes({
  from: { opacity: 0, translate: "0 0.75rem" },
  to: { opacity: 1, translate: "0 0" },
});

/** Paths carry `pathLength={1}`. The stroke stays hidden at 0% so a round cap never shows early. */
const draw = stylex.keyframes({
  "0%": { opacity: 0, strokeDashoffset: 1 },
  "1%": { opacity: 1, strokeDashoffset: 1 },
  "100%": { opacity: 1, strokeDashoffset: 0 },
});

const turnGold = stylex.keyframes({
  from: { color: colors.textDisabled },
  to: { color: colors.emphasis },
});

const glow = stylex.keyframes({
  "0%": { opacity: 0, scale: 0.7 },
  "40%": { opacity: 1 },
  "100%": { opacity: 0, scale: 1.25 },
});

export const styles = stylex.create({
  figure: {
    marginInline: "auto",
    display: "flex",
    width: "100%",
    // From `lg` the bracket shares the first viewport with the header and the result card.
    maxWidth: {
      default: "40rem",
      [media.lg]: "min(40rem, max(24rem, 100dvh - 15rem))",
    },
    flexDirection: "column",
    alignItems: "flex-end",
  },
  board: {
    position: "relative",
    width: "100%",
    aspectRatio: "1",
  },
  lines: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "visible",
    fill: "none",
  },
  fullOnly: {
    display: {
      default: "block",
      [media.maxSm]: "none",
    },
  },
  compactOnly: {
    display: {
      default: "none",
      [media.maxSm]: "block",
    },
  },
  // viewBox units: the board renders at ~78% on desktop and ~45% at 360 px, so these widths land
  // near 1.5 px on screen. Round ends keep the radial-to-arc elbows from showing a notch.
  link: {
    stroke: colors.border,
    strokeWidth: {
      default: 2,
      [media.maxSm]: 3.25,
    },
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: 1,
    animationName: draw,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-standard)",
    animationFillMode: "both",
  },
  junction: {
    fill: colors.textDisabled,
    transformBox: "fill-box",
    transformOrigin: "center",
    animationName: popIn,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-emphasized)",
    animationFillMode: "both",
  },
  junctionChampion: {
    fill: colors.primary,
    animationDuration: "var(--duration-fast)",
  },
  junctionActive: {
    fill: colors.foreground,
  },
  disc: {
    fill: colors.surface,
    stroke: colors.border,
    strokeWidth: 1.5,
    animationName: fadeIn,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-emphasized)",
    animationFillMode: "both",
  },
  route: {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: 1,
    animationName: draw,
    animationTimingFunction: "var(--ease-standard)",
    animationFillMode: "both",
  },
  routeChampion: {
    stroke: colors.primary,
    strokeWidth: {
      default: 4,
      [media.maxSm]: 6,
    },
    animationDuration: DRAW_DURATION,
  },
  routeActive: {
    stroke: colors.foreground,
    strokeWidth: {
      default: 3,
      [media.maxSm]: 4.5,
    },
    animationDuration: "var(--duration-slow)",
  },
  trophy: {
    position: "absolute",
    top: "50%",
    left: "50%",
    display: "flex",
    width: {
      default: "7.5%",
      [media.maxSm]: "10%",
    },
    aspectRatio: "1",
    translate: "-50% -50%",
    pointerEvents: "none",
    animationName: fadeIn,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-emphasized)",
    animationFillMode: "both",
  },
  trophyIcon: {
    width: "100%",
    height: "100%",
    color: colors.emphasis,
    animationName: turnGold,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-standard)",
    animationFillMode: "both",
  },
  // Same box as the trophy disc; only the shadow shows, as a single pulse when the cup turns gold.
  halo: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: {
      default: "14%",
      [media.maxSm]: "18%",
    },
    aspectRatio: "1",
    translate: "-50% -50%",
    borderRadius: "var(--corner-full)",
    pointerEvents: "none",
    boxShadow: "0 0 3rem 0.75rem color-mix(in oklab, var(--emphasis) 40%, transparent)",
    opacity: 0,
    animationName: glow,
    animationDuration: "calc(var(--duration-slow) * 1.5)",
    animationTimingFunction: "var(--ease-standard)",
    animationFillMode: "both",
  },
  clubs: {
    position: "absolute",
    inset: 0,
    listStyleType: "none",
  },
  club: {
    position: "absolute",
    translate: "-50% -50%",
    animationName: popIn,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-emphasized)",
    animationFillMode: "both",
  },
  clubFull: {
    display: {
      default: "block",
      [media.maxSm]: "none",
    },
  },
  clubCompact: {
    display: {
      default: "none",
      [media.maxSm]: "block",
    },
  },
  at: (left: string, top: string) => ({
    left,
    top,
  }),
  crestButton: {
    display: "flex",
    width: "3rem",
    height: "3rem",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderWidth: 0,
    borderRadius: "var(--corner-full)",
    backgroundColor: "transparent",
    cursor: "default",
    outlineWidth: {
      default: 0,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineOffset: {
      default: null,
      ":focus-visible": "4px",
    },
    outlineColor: {
      default: null,
      ":focus-visible": colors.ring,
    },
  },
  // Round slot the links reach; the crest sits centred inside with room around it.
  crest: {
    display: "flex",
    width: "3rem",
    height: "3rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-full)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textTertiary,
    outlineWidth: 2,
    outlineStyle: "solid",
    // The ring sits on the border: with a gap, the route crossing it looks detached from the crest.
    outlineOffset: 0,
    outlineColor: "transparent",
    transitionProperty: "background-color, border-color, color, outline-color",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
  },
  crestActive: {
    backgroundColor: colors.surfaceRaised,
    color: colors.foreground,
    outlineColor: colors.foreground,
  },
  crestChampion: {
    backgroundColor: colors.surfaceRaised,
    color: colors.foreground,
    outlineColor: colors.primary,
  },
  // 30 px tall in a 48 px slot: about 9 px of air above and below, 11 px at the sides.
  crestMark: {
    display: "block",
    width: "auto",
    height: "1.875rem",
  },
  tooltipName: {
    fontWeight: "var(--font-weight-bold)",
  },
  card: {
    position: "relative",
    // Its own row under the bracket, centred on it: clear of the lowest crests at every width.
    alignSelf: "center",
    marginTop: space.s4,
    display: "flex",
    maxWidth: "100%",
    alignItems: "center",
    gap: space.s3,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    paddingInline: space.s4,
    paddingBlock: space.s3,
    animationName: riseIn,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-emphasized)",
    animationFillMode: "both",
  },
  // The card tells the outcome: a gold trophy, the one place gold is used besides the centre.
  cardTrophy: {
    display: "flex",
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--emphasis) 16%, transparent)",
  },
  cardTrophyIcon: {
    width: "1.25rem",
    height: "1.25rem",
    color: colors.emphasis,
  },
  cardText: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: space.s1,
  },
  cardResult: {
    color: colors.foreground,
    fontWeight: "var(--font-weight-semibold)",
    lineHeight: "var(--leading-snug)",
  },
  cardMeta: {
    color: colors.mutedForeground,
  },
  official: {
    color: colors.primary,
    fontWeight: "var(--font-weight-semibold)",
  },
});

/** Position on the entrance timeline, in `--duration-fast` steps. */
export const delay = stylex.create({
  crests: { animationDelay: `calc(${STEP} * 2)` },
  ring0: { animationDelay: `calc(${STEP} * 3)` },
  ring1: { animationDelay: `calc(${STEP} * 4)` },
  ring2: { animationDelay: `calc(${STEP} * 5)` },
  ring3: { animationDelay: `calc(${STEP} * 6)` },
  champion: { animationDelay: `calc(${STEP} * 7)` },
  championRing1: { animationDelay: `calc(${STEP} * 7.25)` },
  championRing2: { animationDelay: `calc(${STEP} * 7.75)` },
  championRing3: { animationDelay: `calc(${STEP} * 8.5)` },
  gold: { animationDelay: `calc(${STEP} * 9)` },
  card: { animationDelay: `calc(${STEP} * 10)` },
});

/** Entrance delay of a ring's links, by depth. */
export const RING_DELAY = [delay.ring0, delay.ring1, delay.ring2, delay.ring3] as const;

/** When the lime route passes each junction on its way in, by depth. */
export const CHAMPION_JUNCTION_DELAY = [
  delay.championRing1,
  delay.championRing2,
  delay.championRing3,
] as const;
