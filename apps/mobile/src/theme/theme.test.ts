import { describe, expect, it } from "vite-plus/test";
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
    expect(theme.typo("display")).toMatchObject({
      fontFamily: "Manrope_700Bold",
      fontWeight: "700",
    });
    expect(theme.typo("heading")).toMatchObject({
      fontFamily: "Manrope_700Bold",
      fontWeight: "700",
    });
    expect(theme.typo("title")).toMatchObject({
      fontFamily: "Manrope_600SemiBold",
      fontWeight: "600",
      fontSize: 18,
    });
    expect(theme.typo("score")).toMatchObject({
      fontFamily: "Manrope_600SemiBold",
      fontWeight: "600",
    });
    expect(theme.typo("label")).toMatchObject({
      fontFamily: "Manrope_500Medium",
      fontWeight: "500",
    });
    expect(theme.typo("body").fontFamily).toBe("Manrope_400Regular");
    expect(theme.typo("body").fontWeight).toBeUndefined();
  });

  it("uses tabular figures for scores only", () => {
    expect(theme.typo("score").fontVariant).toEqual(["tabular-nums"]);
    expect(theme.typo("body").fontVariant).toBeUndefined();
  });
});
