import { describe, expect, it } from "vite-plus/test";
import { theme } from "./theme.ts";

describe("native typography tokens", () => {
  it("resolves referenced size, leading and tracking tokens", () => {
    const heading = theme.typo("heading");
    const label = theme.typo("label");
    expect(heading.fontSize).toBeGreaterThan(0);
    expect(heading.lineHeight).toBeGreaterThan(heading.fontSize ?? 0);
    expect(label.letterSpacing).toBeGreaterThan(0);
  });
});
