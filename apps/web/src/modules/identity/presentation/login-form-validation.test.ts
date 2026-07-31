import { describe, expect, it } from "vite-plus/test";

import { AUTH_VALIDATION_EMAIL, AUTH_VALIDATION_REQUIRED } from "./auth-form-helpers.ts";
import { validateLoginField } from "./login-form-validation.ts";

describe("validateLoginField", () => {
  it("requires email and password", () => {
    expect(validateLoginField("email", "")).toBe(AUTH_VALIDATION_REQUIRED);
    expect(validateLoginField("password", "")).toBe(AUTH_VALIDATION_REQUIRED);
  });

  it("normalizes and validates email", () => {
    expect(validateLoginField("email", " correo-invalido ")).toBe(AUTH_VALIDATION_EMAIL);
    expect(validateLoginField("email", " ana@ejemplo.com ")).toBeNull();
  });

  it("does not apply signup policy rules to an existing password", () => {
    expect(validateLoginField("password", "123")).toBeNull();
  });
});
