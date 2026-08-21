import { describe, expect, it } from "vite-plus/test";
import { normalizeGameAccountIdentifier } from "./player-game-account.ts";

describe("normalizeGameAccountIdentifier", () => {
  it.each([
    ["PlayerOne", "playerone"],
    ["  player one  ", "player one"],
    ["MiXeDcAsE_99", "mixedcase_99"],
  ])("normalizes %s to %s", (identifier, expected) => {
    expect(normalizeGameAccountIdentifier(identifier)).toBe(expected);
  });

  it("is idempotent", () => {
    const once = normalizeGameAccountIdentifier("  GamerTag ");
    expect(normalizeGameAccountIdentifier(once)).toBe(once);
  });
});
