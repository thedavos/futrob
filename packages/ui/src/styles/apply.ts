import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import type { StyleXStyles } from "@stylexjs/stylex";

export type { StyleXStyles };

type StyleArg = StyleXStyles | object | null | undefined | false;

interface HostRenderState {}

type HostClassNameCallback = (state: never) => string | undefined;
type HostStyleCallback = (state: never) => CSSProperties | undefined;
type AppliedClassNameCallback = (state: HostRenderState) => string | undefined;
type AppliedStyleCallback = (state: HostRenderState) => CSSProperties | undefined;

/** Compiled `stylex.create` map. Narrower than `object` so leftover tokens type-check. */
export interface StyleXCompiledStyles {
  readonly [property: string]: string | boolean | null | undefined;
}

/** String leftover, StyleX token, or compiled `stylex.create` entry. */
export type HostClassName = string | StyleXStyles | StyleXCompiledStyles;
export type HostStyle = CSSProperties | HostStyleCallback;

type LeftoverClassName = HostClassName | HostClassNameCallback;

type AppliedClassName = string | AppliedClassNameCallback;
type AppliedStyle = CSSProperties | AppliedStyleCallback;

type AppliedProps = {
  readonly className?: AppliedClassName;
  readonly style?: AppliedStyle;
};

type StaticAppliedProps = {
  readonly className?: string;
  readonly style?: CSSProperties;
};

export function applyStyles(...styles: StyleArg[]) {
  // SAFETY: stylex.props rest overloads expect CompiledStyles tuples; tokens
  // from stylex.create are that compiled form at every applyStyles call site.
  return stylex.props(...(styles as never[]));
}

function isClassString(className: LeftoverClassName): className is string {
  return Object.prototype.toString.call(className) === "[object String]";
}

function isStyleXOverride(className: LeftoverClassName | undefined): className is StyleArg {
  if (className == null || className instanceof Function) return false;
  return !isClassString(className);
}

function mergeClassName(
  applied: string | undefined,
  leftover: string | HostClassNameCallback | undefined,
): AppliedClassName | undefined {
  if (leftover instanceof Function) {
    return (state) => {
      // SAFETY: leftover is the Base UI render callback accepted at the call
      // site; we forward the same primitive state object.
      const resolved = leftover(state as never);
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
      const resolved = leftover(state as never);
      if (applied == null && resolved == null) return undefined;
      return { ...applied, ...resolved };
    };
  }
  if (applied == null && leftover == null) return undefined;
  return { ...applied, ...leftover };
}

export function applyProps(
  className?: HostClassName,
  htmlStyle?: CSSProperties,
  ...styles: StyleArg[]
): StaticAppliedProps;
export function applyProps(
  className?: LeftoverClassName,
  htmlStyle?: HostStyle,
  ...styles: StyleArg[]
): AppliedProps;
export function applyProps(
  className?: LeftoverClassName,
  htmlStyle?: HostStyle,
  ...styles: StyleArg[]
): AppliedProps {
  const leftoverOverride = isStyleXOverride(className) ? className : undefined;
  const leftoverClass =
    leftoverOverride === undefined &&
    (className instanceof Function || (className != null && isClassString(className)))
      ? className
      : undefined;

  // SAFETY: stylex.props rest overloads expect CompiledStyles tuples; tokens
  // from stylex.create are that compiled form at every applyProps call site.
  // Leftover StyleX tokens go last so caller overrides win (same property).
  const applied = stylex.props(...(styles as never[]), leftoverOverride as never);
  return {
    className: mergeClassName(applied.className, leftoverClass),
    style: mergeStyle(applied.style, htmlStyle),
  };
}
