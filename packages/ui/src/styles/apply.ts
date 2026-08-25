import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import type { StyleXStyles } from "@stylexjs/stylex";

export type { StyleXStyles };

type StyleArg = StyleXStyles | object | null | undefined | false;

/** Leftover React or Base UI `className` (string, or a render-state function we drop). */
type HostClassName = string | ((state: never) => string | undefined);

/** Leftover React or Base UI `style` (CSS properties, or a render-state function we drop). */
type HostStyle = CSSProperties | ((state: never) => CSSProperties | undefined);

/**
 * Apply StyleX styles to a host element. Last argument wins, same as
 * `stylex.props` / the old `cn(...)` order.
 */
export function applyStyles(...styles: StyleArg[]) {
  // SAFETY: stylex.props rest overloads expect CompiledStyles tuples; tokens
  // from stylex.create are that compiled form at every applyStyles call site.
  return stylex.props(...(styles as never[]));
}

function leftoverClassName(className: HostClassName | undefined): string | undefined {
  if (className instanceof Function) return undefined;
  return className;
}

function leftoverHostStyle(htmlStyle: HostStyle | undefined): CSSProperties | undefined {
  if (htmlStyle instanceof Function) return undefined;
  return htmlStyle;
}

/**
 * Merge compiled StyleX output with leftover `className` / inline `style`
 * (Base UI `render`, SVG marks, tests). Prefer `sx` StyleX tokens over
 * raw class strings.
 */
export function applyHost(className?: HostClassName, htmlStyle?: HostStyle, ...styles: StyleArg[]) {
  // SAFETY: stylex.props rest overloads expect CompiledStyles tuples; tokens
  // from stylex.create are that compiled form at every applyHost call site.
  const applied = stylex.props(...(styles as never[]));
  const leftoverClass = leftoverClassName(className);
  const leftoverStyle = leftoverHostStyle(htmlStyle);
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
