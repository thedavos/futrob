import { describe, expect, it } from "vite-plus/test";
import { externalReferenceKey } from "./external-reference.ts";

describe("externalReferenceKey", () => {
  it("joins provider key and external id", () => {
    expect(externalReferenceKey({ providerKey: "ea-clubs", externalId: "club-42" })).toBe(
      "ea-clubs:club-42",
    );
  });
});
