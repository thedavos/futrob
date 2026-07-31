import { describe, expect, it } from "vite-plus/test";

import { AUTH_VALIDATION_PASSWORD_LETTER, AUTH_VALIDATION_REQUIRED } from "./auth-form-helpers.ts";
import { validateSignupField } from "./signup-form-validation.ts";

describe("validateSignupField", () => {
  it("normalizes text fields before validating them", () => {
    expect(validateSignupField("name", "   ")).toBe(AUTH_VALIDATION_REQUIRED);
    expect(validateSignupField("email", " ana@ejemplo.com ")).toBeNull();
  });

  it("returns the first unmet password requirement", () => {
    expect(validateSignupField("password", "12345678")).toBe(AUTH_VALIDATION_PASSWORD_LETTER);
  });
});
