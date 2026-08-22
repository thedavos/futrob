/**
 * Field validation mirroring apps/web identity forms (same ES copy):
 * see `login-form-validation.ts` / `signup-form-validation.ts`.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_HAS_LETTER = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
const PASSWORD_HAS_NUMBER = /\d/;

export const AUTH_VALIDATION_REQUIRED = "Este campo es obligatorio.";
export const AUTH_VALIDATION_EMAIL = "Ingresa un correo electrónico válido.";
export const AUTH_PASSWORD_HINT = "Mínimo 8 caracteres, incluyendo letras y números.";
export const AUTH_VALIDATION_PASSWORD_LENGTH = "Usa al menos 8 caracteres.";
export const AUTH_VALIDATION_PASSWORD_LETTER = "Incluye al menos una letra.";
export const AUTH_VALIDATION_PASSWORD_NUMBER = "Incluye al menos un número.";

export function getPasswordPolicyError(value: string): string | null {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return AUTH_VALIDATION_PASSWORD_LENGTH;
  }
  if (!PASSWORD_HAS_LETTER.test(value)) {
    return AUTH_VALIDATION_PASSWORD_LETTER;
  }
  if (!PASSWORD_HAS_NUMBER.test(value)) {
    return AUTH_VALIDATION_PASSWORD_NUMBER;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (value.length === 0) {
    return AUTH_VALIDATION_REQUIRED;
  }
  return EMAIL_PATTERN.test(value) ? null : AUTH_VALIDATION_EMAIL;
}

export function validateRequired(value: string): string | null {
  return value.length === 0 ? AUTH_VALIDATION_REQUIRED : null;
}

export function validatePassword(value: string): string | null {
  if (value.length === 0) {
    return AUTH_VALIDATION_REQUIRED;
  }
  return getPasswordPolicyError(value);
}
