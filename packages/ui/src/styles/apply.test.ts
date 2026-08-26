import * as stylex from "@stylexjs/stylex";
import { describe, expect, it } from "vite-plus/test";

import { applyProps } from "./apply.ts";

const tokens = stylex.create({
  column: { flexDirection: "column" },
  row: { flexDirection: "row" },
});

describe("applyProps", () => {
  it("merges leftover string className after compiled StyleX classes", () => {
    const applied = applyProps("extra", undefined);

    expect(applied.className).toBe("extra");
  });

  it("applies leftover StyleX tokens after component tokens so last wins", () => {
    const base = { $$css: true, display: "x-base" };
    const override = { $$css: true, display: "x-override" };
    const applied = applyProps(override, undefined, base);

    expect(applied.className?.split(/\s+/)).toContain("x-override");
    expect(applied.className?.split(/\s+/)).not.toContain("x-base");
  });

  it("detects compiled stylex.create tokens as leftover overrides", () => {
    const applied = applyProps(tokens.row, undefined, tokens.column);
    const columnOnly = applyProps(undefined, undefined, tokens.column);
    const rowOnly = applyProps(undefined, undefined, tokens.row);
    const atomic = (className?: string) =>
      className?.split(/\s+/).filter((name) => name.startsWith("x")) ?? [];

    expect(atomic(applied.className)).toEqual(atomic(rowOnly.className));
    expect(atomic(applied.className)).not.toEqual(atomic(columnOnly.className));
  });

  it("keeps leftover string className next to compiled StyleX classes", () => {
    const base = { $$css: true, display: "x-base" };
    const applied = applyProps("extra", undefined, base);

    expect(applied.className?.split(/\s+/)).toEqual(expect.arrayContaining(["x-base", "extra"]));
  });

  it("keeps leftover className callbacks callable with primitive state", () => {
    const applied = applyProps(
      (state: { pressed: boolean }) => (state.pressed ? "is-pressed" : ""),
      undefined,
    );

    const leftoverClass = applied.className;
    expect(leftoverClass).toBeTypeOf("function");
    if (leftoverClass instanceof Function) {
      expect(leftoverClass({ pressed: true })).toBe("is-pressed");
      expect(leftoverClass({ pressed: false })).toBeUndefined();
    }
  });

  it("keeps leftover style callbacks callable with primitive state", () => {
    const applied = applyProps(undefined, (state: { open: boolean }) =>
      state.open ? { opacity: 0.5 } : undefined,
    );

    const leftoverStyle = applied.style;
    expect(leftoverStyle).toBeTypeOf("function");
    if (leftoverStyle instanceof Function) {
      expect(leftoverStyle({ open: true })).toEqual({ opacity: 0.5 });
      expect(leftoverStyle({ open: false })).toBeUndefined();
    }
  });
});
