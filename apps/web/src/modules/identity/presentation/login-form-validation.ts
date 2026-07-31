import {
  AUTH_VALIDATION_EMAIL,
  AUTH_VALIDATION_REQUIRED,
  EMAIL_PATTERN,
} from "@/modules/identity/presentation/auth-form-helpers.ts";
import type { AuthFormField } from "@/modules/identity/presentation/auth-form-state.ts";

export type LoginField = Extract<AuthFormField, "email" | "password">;

export interface LoginValues {
  email: string;
  password: string;
}

export function validateLoginField(field: LoginField, value: string): string | null {
  const normalizedValue = field === "password" ? value : value.trim();

  if (normalizedValue.length === 0) {
    return AUTH_VALIDATION_REQUIRED;
  }

  if (field === "email" && !EMAIL_PATTERN.test(normalizedValue)) {
    return AUTH_VALIDATION_EMAIL;
  }

  return null;
}
