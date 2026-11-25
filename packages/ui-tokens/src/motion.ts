import { raw, type TokenMap } from "./token.ts";

export const MOTION_TOKENS: TokenMap = {
  "duration-fast": raw("120ms"),
  "duration-normal": raw("180ms"),
  "duration-slow": raw("280ms"),
  "ease-standard": raw("cubic-bezier(0.2, 0, 0, 1)"),
  "ease-emphasized": raw("cubic-bezier(0.16, 1, 0.3, 1)"),
};

export const LAYERING_TOKENS: TokenMap = {
  "z-sticky": raw("20"),
  "z-dropdown": raw("40"),
  "z-overlay": raw("60"),
  "z-dialog": raw("80"),
  /** Portaled floating surfaces (Select, DropdownMenu, Popover) stay above Dialog/Sheet. */
  "z-popover": raw("90"),
  /** Tooltips stay above dialogs and popovers. */
  "z-tooltip": raw("95"),
  "z-toast": raw("100"),
};
