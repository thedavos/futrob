import { mixOklab, oklch, oklchToHex, resolveThemeColor, themeToHexColors } from "./index.ts";
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
    expect(oklchToHex(resolveThemeColor("primary", LIGHT_THEME)!)).toBe("#caff35");
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

describe("derived text tiers", () => {
  const hex = themeToHexColors();
  const luminance = (value: string) => {
    const channels = [1, 3, 5]
      .map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  };
  const contrast = (a: string, b: string) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high! + 0.05) / (low! + 0.05);
  };

  it("mixes gray-light toward graphite-deep in OKLab", () => {
    expect(hex["text-tertiary"]).toBe("#9299a0");
    expect(hex["text-disabled"]).toBe("#585d62");
    expect(mixOklab(oklch(1, 0, 0), oklch(0, 0, 0), 0.25).l).toBeCloseTo(0.25);
  });

  it("keeps text-tertiary at AA on every surface", () => {
    for (const surface of ["background", "surface", "surface-raised"]) {
      expect(contrast(hex["text-tertiary"]!, hex[surface]!)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
