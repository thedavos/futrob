import { describe, expect, it } from "vite-plus/test";

import { applyProps } from "./apply.ts";

describe("applyProps", () => {
  it("merges leftover string className after compiled StyleX classes", () => {
    const applied = applyProps("extra", undefined);

    expect(applied.className).toBe("extra");
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
