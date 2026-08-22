import { formatOklch, type Oklch } from "./oklch.ts";

/**
 * A token value as written in `packages/ui/src/tokens.css`:
 * - `oklch(...)` raw color
 * - `var(--name)` reference
 * - `var(--name, var(--fallback))` reference with fallback (chart ramp only)
 * - any literal value (rem, ms, cubic-bezier, numbers…)
 */
export type TokenValue =
  | { readonly kind: "oklch"; readonly color: Oklch }
  | { readonly kind: "ref"; readonly name: string }
  | { readonly kind: "fallbackRef"; readonly name: string; readonly fallbackName: string }
  | { readonly kind: "raw"; readonly value: string };

export type TokenMap = Record<string, TokenValue>;

export const oklchToken = (color: Oklch): TokenValue => ({ kind: "oklch", color });
export const ref = (name: string): TokenValue => ({ kind: "ref", name });
export const fallbackRef = (name: string, fallbackName: string): TokenValue => ({
  kind: "fallbackRef",
  name,
  fallbackName,
});
export const raw = (value: string): TokenValue => ({ kind: "raw", value });

export function toCssValue(value: TokenValue): string {
  switch (value.kind) {
    case "oklch":
      return formatOklch(value.color);
    case "ref":
      return `var(--${value.name})`;
    case "fallbackRef":
      return `var(--${value.name}, var(--${value.fallbackName}))`;
    case "raw":
      return value.value;
  }
}

export function toCssDeclaration(name: string, value: TokenValue): string {
  return `--${name}: ${toCssValue(value)};`;
}
