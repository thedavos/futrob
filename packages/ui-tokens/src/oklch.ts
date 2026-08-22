export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

export function oklch(l: number, c: number, h: number): Oklch {
  return { l, c, h };
}

/** Renders an Oklch color using the same notation as `packages/ui/src/tokens.css`. */
export function formatOklch(color: Oklch): string {
  return `oklch(${color.l} ${color.c} ${color.h})`;
}

function oklchToLinearSrgb(color: Oklch): [number, number, number] {
  const radians = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(radians);
  const b = color.c * Math.sin(radians);

  const l_ = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = color.l - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function gammaEncode(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

/**
 * Converts an Oklch color to an sRGB hex string for platforms that cannot
 * parse `oklch()` (React Native). Values outside the sRGB gamut are clamped.
 */
export function oklchToHex(color: Oklch): string {
  const [r, g, b] = oklchToLinearSrgb(color);
  const hex = [r, g, b]
    .map(gammaEncode)
    .map((value) => Math.round(value * 255))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}
