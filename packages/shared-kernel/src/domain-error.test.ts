import { describe, expect, it } from "vite-plus/test";
import { domainError } from "./domain-error.ts";

describe("domainError", () => {
  it("builds an error without details", () => {
    expect(domainError("results.encounter_not_found", "Encounter not found")).toEqual({
      code: "results.encounter_not_found",
      message: "Encounter not found",
    });
  });

  it("includes details when provided", () => {
    expect(
      domainError("results.invalid_selection", "Bad selection", { expected: 2, received: 1 }),
    ).toEqual({
      code: "results.invalid_selection",
      message: "Bad selection",
      details: { expected: 2, received: 1 },
    });
  });
});
