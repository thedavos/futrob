import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import type { StyleXStyles } from "@stylexjs/stylex";

export type { StyleXStyles };

type StyleArg = StyleXStyles | object | null | undefined | false;

/** Leftover React or Base UI `className` (string, or a render-state function). */
type HostClassName = string | ((state: never) => string | undefined);

/** Leftover React or Base UI `style` (CSS properties, or a render-state function). */
type HostStyle = CSSProperties | ((state: never) => CSSProperties | undefined);

/** Per-primitive Base UI state bag. `applyProps` only forwards it. */
interface HostRenderState {}

type AppliedClassName = string | ((state: HostRenderState) => string | undefined);
type AppliedStyle = CSSProperties | ((state: HostRenderState) => CSSProperties | undefined);

type AppliedProps = {
  readonly className?: AppliedClassName;
  readonly style?: AppliedStyle;
};

type StaticAppliedProps = {
  readonly className?: string;
  readonly style?: CSSProperties;
};

/**
 * Compile StyleX tokens to `{ className, style }`. Last argument wins, same as
 * `stylex.props` / the old `cn(...)` order. Use `applyProps` when leftover
 * React or Base UI `className` / `style` must merge in.
 */
export function applyStyles(...styles: StyleArg[]) {
  // SAFETY: stylex.props rest overloads expect CompiledStyles tuples; tokens
  // from stylex.create are that compiled form at every applyStyles call site.
  return stylex.props(...(styles as never[]));
}

function mergeClassName(
  applied: string | undefined,
  leftover: HostClassName | undefined,
): AppliedClassName | undefined {
  if (leftover instanceof Function) {
    return (state) => {
      // SAFETY: leftover is the Base UI render callback accepted at the call
      // site; we forward the same primitive state object.
      const resolved = (leftover as (value: HostRenderState) => string | undefined)(state);
      const merged = [applied, resolved].filter(Boolean).join(" ");
      return merged.length > 0 ? merged : undefined;
    };
  }
  const merged = [applied, leftover].filter(Boolean).join(" ");
  return merged.length > 0 ? merged : undefined;
}

function mergeStyle(
  applied: CSSProperties | undefined,
  leftover: HostStyle | undefined,
): AppliedStyle | undefined {
  if (leftover instanceof Function) {
    return (state) => {
      // SAFETY: leftover is the Base UI render callback accepted at the call
      // site; we forward the same primitive state object.
      const resolved = (leftover as (value: HostRenderState) => CSSProperties | undefined)(state);
      if (applied == null && resolved == null) return undefined;
      return { ...applied, ...resolved };
    };
  }
  if (applied == null && leftover == null) return undefined;
  return { ...applied, ...leftover };
}

export function applyProps(
  className?: string,
  htmlStyle?: CSSProperties,
  ...styles: StyleArg[]
): StaticAppliedProps;
export function applyProps(
  className?: HostClassName,
  htmlStyle?: HostStyle,
  ...styles: StyleArg[]
): AppliedProps;
export function applyProps(
  className?: HostClassName,
  htmlStyle?: HostStyle,
  ...styles: StyleArg[]
): AppliedProps {
  // SAFETY: stylex.props rest overloads expect CompiledStyles tuples; tokens
  // from stylex.create are that compiled form at every applyProps call site.
  const applied = stylex.props(...(styles as never[]));
  return {
    className: mergeClassName(applied.className, className),
    style: mergeStyle(applied.style, htmlStyle),
  };
}
