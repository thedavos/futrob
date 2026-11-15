import { mixOklab, oklch } from "./oklch.ts";

const GRAPHITE_DEEP = oklch(0.1808615922, 0.0052102948, 248.1161683559); // #101214
const GRAY_LIGHT = oklch(0.769244249, 0.014517727, 248.0166053926); // #ADB5BD

/** Grafito + Lima. Exact sRGB brief converted to OKLCH; see /design.md. */
export const PALETTE = {
  "graphite-deep": GRAPHITE_DEEP,
  graphite: oklch(0.2022635772, 0.006135752, 236.887294627), // #141719
  charcoal: oklch(0.24068262, 0.0082589277, 240.2250432143), // #1C2023
  "gray-dark": oklch(0.288904863, 0.0111908931, 237.0230399473), // #262C30
  slate: oklch(0.3477173428, 0.0128682431, 238.9073288083), // #343B40
  "white-cool": oklch(0.9749023816, 0.0025219025, 228.7838079178), // #F5F7F8
  "gray-light": GRAY_LIGHT,
  // Derived text steps, not new hues: gray-light mixed toward graphite-deep in OKLab.
  "gray-mid": mixOklab(GRAY_LIGHT, GRAPHITE_DEEP, 0.85), // #9299A0, ≥ 4.9:1 on every surface
  "gray-dim": mixOklab(GRAY_LIGHT, GRAPHITE_DEEP, 0.5), // #585D62, inactive UI only
  lime: oklch(0.9306628389, 0.2176079018, 124.1228204854), // #CAFF35
  "lime-soft": oklch(0.9443739457, 0.1741754061, 122.5439670665), // #D8FF70
  olive: oklch(0.3090471232, 0.0554689547, 126.0369202613), // #293514
  green: oklch(0.8003487737, 0.182060385, 151.7110310001), // #4ADE80
  amber: oklch(0.8368605694, 0.1644215948, 84.4286279995), // #FBBF24
  red: oklch(0.7106273469, 0.1661479174, 22.2162240654), // #F87171
  blue: oklch(0.7137400465, 0.1433805094, 254.6240213654), // #60A5FA
  gold: oklch(0.8803031344, 0.1347780269, 86.0615940749), // #FFD166
} as const;

/** Compatibility stops used by the logo and overlays. Prefer semantic tokens. */
export const BRAND_SCALE = { 300: PALETTE["lime-soft"], 500: PALETTE.lime, 700: PALETTE.lime };
