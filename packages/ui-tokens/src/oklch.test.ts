import { oklchToHex, resolveThemeColor } from "./index.ts";
import { describe, expect, it } from "vite-plus/test";
import { LIGHT_THEME } from "./theme-light.ts";

describe("oklchToHex", () => {
  it("converts white and black", () => {
    expect(oklchToHex({ l: 1, c: 0, h: 0 })).toBe("#ffffff");
    expect(oklchToHex({ l: 0, c: 0, h: 0 })).toBe("#000000");
  });

  it("clamps out-of-gamut channels", () => {
    const hex = oklchToHex({ l: 1.2, c: 0.4, h: 150 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("resolveThemeColor", () => {
  it("walks var() references to a raw color", () => {
    expect(resolveThemeColor("primary", LIGHT_THEME)).toEqual({
      l: 0.527,
      c: 0.142,
      h: 149.579,
    });
  });

  it("resolves alias chains like destructive → danger", () => {
    expect(resolveThemeColor("destructive-foreground", LIGHT_THEME)).toEqual(
      resolveThemeColor("danger-foreground", LIGHT_THEME),
    );
  });

  it("returns null for non-color tokens", () => {
    expect(resolveThemeColor("font-ui", LIGHT_THEME)).toBeNull();
    expect(resolveThemeColor("nonexistent", LIGHT_THEME)).toBeNull();
  });
});
