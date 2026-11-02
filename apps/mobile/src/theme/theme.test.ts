import { describe, expect, it } from "vite-plus/test";
import { TYPO_ROLES } from "@futrob/ui-tokens";
import { theme } from "./theme.ts";

describe("native typography tokens", () => {
  it("resolves referenced size, leading and tracking tokens", () => {
    const heading = theme.typo("heading");
    const label = theme.typo("label");
    expect(heading.fontSize).toBeGreaterThan(0);
    expect(heading.lineHeight).toBe(25);
    expect(label.letterSpacing).toBeGreaterThan(0);
  });

  it("maps each role weight token to the matching Manrope face", () => {
    expect(theme.typo("display").fontFamily).toBe("Manrope_700Bold");
    expect(theme.typo("heading").fontFamily).toBe("Manrope_700Bold");
    expect(theme.typo("title").fontFamily).toBe("Manrope_600SemiBold");
    expect(theme.typo("title").fontSize).toBe(18);
    expect(theme.typo("score").fontFamily).toBe("Manrope_600SemiBold");
    expect(theme.typo("label").fontFamily).toBe("Manrope_500Medium");
    expect(theme.typo("body").fontFamily).toBe("Manrope_400Regular");
  });

  it("never pairs a face family with fontWeight (Android would fall back to the system font)", () => {
    for (const role of TYPO_ROLES) {
      expect(theme.typo(role).fontWeight).toBeUndefined();
    }
  });

  it("uses tabular figures for scores only", () => {
    expect(theme.typo("score").fontVariant).toEqual(["tabular-nums"]);
    expect(theme.typo("body").fontVariant).toBeUndefined();
  });
});
