import { describe, expect, it } from "vite-plus/test";
import { AuthServiceUnavailableError } from "@/modules/identity/server/auth-errors.ts";
import { isExpectedFailure } from "./expected-failure.ts";

describe("isExpectedFailure", () => {
  it("treats an object with a string code as expected", () => {
    expect(isExpectedFailure({ code: "auth.unavailable" })).toBe(true);
  });

  it("treats a TaggedError with a wire code as expected", () => {
    expect(
      isExpectedFailure(
        new AuthServiceUnavailableError({
          code: "auth.unavailable",
          message: "Authentication service is unavailable",
        }),
      ),
    ).toBe(true);
  });

  it("treats a generic Error as unexpected", () => {
    expect(isExpectedFailure(new Error("loader crashed"))).toBe(false);
  });

  it("treats a non-string code as unexpected", () => {
    expect(isExpectedFailure({ code: 404 })).toBe(false);
  });

  it("treats a string or null as unexpected", () => {
    expect(isExpectedFailure("boom")).toBe(false);
    expect(isExpectedFailure(null)).toBe(false);
  });
});
