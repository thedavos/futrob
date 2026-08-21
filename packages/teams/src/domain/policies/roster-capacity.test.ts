import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_MAX_ROSTER_SIZE, resolveMaxRosterSize } from "./roster-capacity.ts";

describe("resolveMaxRosterSize", () => {
  it("falls back to the default when the competition does not override it", () => {
    expect(resolveMaxRosterSize(null)).toBe(DEFAULT_MAX_ROSTER_SIZE);
  });

  it("uses the competition override when present", () => {
    expect(resolveMaxRosterSize(16)).toBe(16);
  });

  it("treats zero as an explicit (degenerate) override", () => {
    expect(resolveMaxRosterSize(0)).toBe(0);
  });
});
