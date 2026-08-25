import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import type { StyleXStyles } from "@stylexjs/stylex";

export type { StyleXStyles };

type StyleArg = StyleXStyles | object | null | undefined | false;

/**
 * Apply StyleX styles to a host element. Last argument wins, same as
 * `stylex.props` / the old `cn(...)` order.
 */
export function applyStyles(...styles: StyleArg[]) {
  return stylex.props(...(styles as never[]));
}

/**
 * Merge compiled StyleX output with leftover `className` / inline `style`
 * (Base UI `render`, SVG marks, tests). Prefer `sx` StyleX tokens over
 * raw class strings.
 */
export function applyHost(className?: unknown, htmlStyle?: unknown, ...styles: StyleArg[]) {
  const applied = stylex.props(...(styles as never[]));
  const leftoverClass = typeof className === "string" ? className : undefined;
  const leftoverStyle =
    htmlStyle != null && typeof htmlStyle === "object" ? (htmlStyle as CSSProperties) : undefined;
  const mergedClass = [applied.className, leftoverClass].filter(Boolean).join(" ");
  const mergedStyle =
    applied.style != null || leftoverStyle != null
      ? { ...applied.style, ...leftoverStyle }
      : undefined;

  return {
    className: mergedClass.length > 0 ? mergedClass : undefined,
    style: mergedStyle,
  };
}
