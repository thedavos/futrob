import { raw, type TokenMap } from "./token.ts";

export const SPACING_TOKENS: TokenMap = {
  "space-0": raw("0"),
  "space-1": raw("0.25rem"),
  "space-2": raw("0.5rem"),
  "space-3": raw("0.75rem"),
  "space-4": raw("1rem"),
  "space-5": raw("1.25rem"),
  "space-6": raw("1.5rem"),
  "space-8": raw("2rem"),
  "space-10": raw("2.5rem"),
  "space-12": raw("3rem"),
  "space-16": raw("4rem"),
  "space-20": raw("5rem"),
};

/** Corner ramp. Single source; apps map it onto their platform radius namespace. */
export const CORNER_TOKENS: TokenMap = {
  "corner-xs": raw("0.25rem"),
  "corner-sm": raw("0.375rem"),
  "corner-md": raw("0.5rem"),
  "corner-lg": raw("0.75rem"),
  "corner-xl": raw("1rem"),
  "corner-2xl": raw("1.5rem"),
  "corner-3xl": raw("2rem"),
  "corner-full": raw("9999px"),
};

/**
 * Universal controls. `dense` is the only compact mode and never drops below
 * 36px; on touch surfaces both resolve to 44px.
 */
export const CONTROL_TOKENS: TokenMap = {
  "control-height": raw("2.75rem"),
  "control-height-dense": raw("2.25rem"),
  "control-height-touch": raw("2.75rem"),
  "content-reading": raw("65ch"),
  "content-wide": raw("90rem"),
};

export const GEOMETRY_TOKENS: TokenMap = {
  ...SPACING_TOKENS,
  ...CORNER_TOKENS,
  ...CONTROL_TOKENS,
};
