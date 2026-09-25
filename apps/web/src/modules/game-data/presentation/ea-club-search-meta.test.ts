import { describe, expect, it } from "vite-plus/test";
import { formatProviderGameEdition, toProviderGameEdition } from "./ea-club-search-meta.ts";

describe("formatProviderGameEdition", () => {
  it("formats provider keys for display", () => {
    expect(formatProviderGameEdition("fc26")).toBe("FC 26");
    expect(formatProviderGameEdition("fc_25")).toBe("FC 25");
  });
});

describe("toProviderGameEdition", () => {
  it("normalizes display editions to EA provider keys", () => {
    expect(toProviderGameEdition("FC 26")).toBe("fc26");
    expect(toProviderGameEdition("FC 25")).toBe("fc25");
    expect(toProviderGameEdition("fc_26")).toBe("fc26");
  });

  it("falls back when the edition is blank", () => {
    expect(toProviderGameEdition("")).toBe("fc26");
    expect(toProviderGameEdition("   ", "fc25")).toBe("fc25");
  });
});
