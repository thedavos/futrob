import { describe, expect, it } from "vite-plus/test";

import { formatSignedNumber } from "./format-signed-number.ts";

describe("formatSignedNumber", () => {
  const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

  it("prefixes plus, minus, and leaves zero unsigned", () => {
    expect(formatSignedNumber(1.2, numberFormat)).toBe("+1.2");
    expect(formatSignedNumber(-1.2, numberFormat)).toBe("−1.2");
    expect(formatSignedNumber(0, numberFormat)).toBe("0");
  });
});
