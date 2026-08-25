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

    expect(applied.className).toBeTypeOf("function");
    if (!(applied.className instanceof Function)) {
      throw new Error("expected className callback");
    }
    expect(applied.className({ pressed: true })).toBe("is-pressed");
    expect(applied.className({ pressed: false })).toBeUndefined();
  });

  it("keeps leftover style callbacks callable with primitive state", () => {
    const applied = applyProps(undefined, (state: { open: boolean }) =>
      state.open ? { opacity: 0.5 } : undefined,
    );

    expect(applied.style).toBeTypeOf("function");
    if (!(applied.style instanceof Function)) {
      throw new Error("expected style callback");
    }
    expect(applied.style({ open: true })).toEqual({ opacity: 0.5 });
    expect(applied.style({ open: false })).toBeUndefined();
  });
});
