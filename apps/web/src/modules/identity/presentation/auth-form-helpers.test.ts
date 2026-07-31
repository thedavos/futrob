import { describe, expect, it } from "vite-plus/test";

import {
  AUTH_VALIDATION_PASSWORD_LENGTH,
  AUTH_VALIDATION_PASSWORD_LETTER,
  AUTH_VALIDATION_PASSWORD_NUMBER,
  getPasswordPolicyError,
  isPasswordPolicyValid,
} from "./auth-form-helpers.ts";

describe("getPasswordPolicyError", () => {
  it("prioritizes the minimum length requirement", () => {
    expect(getPasswordPolicyError("abc123")).toBe(AUTH_VALIDATION_PASSWORD_LENGTH);
  });

  it("identifies a missing letter", () => {
    expect(getPasswordPolicyError("12345678")).toBe(AUTH_VALIDATION_PASSWORD_LETTER);
  });

  it("identifies a missing number", () => {
    expect(getPasswordPolicyError("abcdefgh")).toBe(AUTH_VALIDATION_PASSWORD_NUMBER);
  });

  it("accepts a password that satisfies the policy", () => {
    expect(getPasswordPolicyError("contraseña8")).toBeUndefined();
  });
});

describe("isPasswordPolicyValid", () => {
  it("returns true only when there is no validation error", () => {
    expect(isPasswordPolicyValid("contraseña8")).toBe(true);
    expect(isPasswordPolicyValid("12345678")).toBe(false);
  });
});
