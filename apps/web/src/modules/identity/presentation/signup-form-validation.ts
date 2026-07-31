import {
  AUTH_VALIDATION_EMAIL,
  AUTH_VALIDATION_REQUIRED,
  EMAIL_PATTERN,
  getPasswordPolicyError,
} from "@/modules/identity/presentation/auth-form-helpers.ts";
import type { AuthFormField } from "@/modules/identity/presentation/auth-form-state.ts";

export interface SignupValues {
  name: string;
  email: string;
  password: string;
}

type SignupFieldValidator = (value: string) => string | null;

const signupFieldValidators: Record<AuthFormField, SignupFieldValidator> = {
  name: (value) => (value.length === 0 ? AUTH_VALIDATION_REQUIRED : null),
  email: (value) => {
    if (value.length === 0) {
      return AUTH_VALIDATION_REQUIRED;
    }

    return EMAIL_PATTERN.test(value) ? null : AUTH_VALIDATION_EMAIL;
  },
  password: (value) => {
    if (value.length === 0) {
      return AUTH_VALIDATION_REQUIRED;
    }

    return getPasswordPolicyError(value) ?? null;
  },
};

export function validateSignupField(field: AuthFormField, value: string): string | null {
  const normalizedValue = field === "password" ? value : value.trim();
  return signupFieldValidators[field](normalizedValue);
}
