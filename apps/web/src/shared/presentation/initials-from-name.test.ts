import { describe, expect, it } from "vite-plus/test";

import { initialsFromName } from "./initials-from-name.ts";

describe("initialsFromName", () => {
  it("builds one or two character initials", () => {
    expect(initialsFromName("Fera Enjaulada")).toBe("FE");
    expect(initialsFromName("Night")).toBe("NI");
    expect(initialsFromName("  ")).toBe("?");
  });
});
