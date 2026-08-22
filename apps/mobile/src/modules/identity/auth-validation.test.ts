import { describe, expect, it } from "vite-plus/test";
import {
  AUTH_VALIDATION_EMAIL,
  AUTH_VALIDATION_PASSWORD_LETTER,
  AUTH_VALIDATION_PASSWORD_LENGTH,
  AUTH_VALIDATION_PASSWORD_NUMBER,
  AUTH_VALIDATION_REQUIRED,
  getPasswordPolicyError,
  validateEmail,
  validatePassword,
  validateRequired,
} from "./auth-validation";

describe("validateRequired", () => {
  it("rejects empty values", () => {
    expect(validateRequired("")).toBe(AUTH_VALIDATION_REQUIRED);
  });

  it("accepts non-empty values", () => {
    expect(validateRequired("Futrob")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("rejects empty values", () => {
    expect(validateEmail("")).toBe(AUTH_VALIDATION_REQUIRED);
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("sin-arroba")).toBe(AUTH_VALIDATION_EMAIL);
    expect(validateEmail("a@b")).toBe(AUTH_VALIDATION_EMAIL);
  });

  it("accepts valid addresses", () => {
    expect(validateEmail("capitan@club.mx")).toBeNull();
  });
});

describe("password policy", () => {
  it("requires minimum length", () => {
    expect(getPasswordPolicyError("abc12")).toBe(AUTH_VALIDATION_PASSWORD_LENGTH);
  });

  it("requires at least one letter", () => {
    expect(getPasswordPolicyError("12345678")).toBe(AUTH_VALIDATION_PASSWORD_LETTER);
  });

  it("requires at least one number", () => {
    expect(getPasswordPolicyError("abcdefgh")).toBe(AUTH_VALIDATION_PASSWORD_NUMBER);
  });

  it("accepts letters and numbers over the length floor", () => {
    expect(getPasswordPolicyError("futrob123")).toBeNull();
  });

  it("validatePassword surfaces required before policy", () => {
    expect(validatePassword("")).toBe(AUTH_VALIDATION_REQUIRED);
  });
});
