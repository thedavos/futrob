export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export interface AuthClientError {
  code?: string;
  status: number;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof Error && /fetch|network|load failed/i.test(error.message);
}

export const AUTH_ERROR_NETWORK =
  "No pudimos conectar con el servicio. Revisa tu conexión e intenta de nuevo.";
export const AUTH_ERROR_GENERIC = "No pudimos completar la solicitud. Intenta de nuevo.";
export const AUTH_VALIDATION_REQUIRED = "Este campo es obligatorio.";
export const AUTH_VALIDATION_EMAIL = "Ingresa un correo electrónico válido.";
export const AUTH_PASSWORD_HINT = "Mínimo 8 caracteres, incluyendo letras y números.";
export const AUTH_VALIDATION_PASSWORD_LENGTH = "Usa al menos 8 caracteres.";
export const AUTH_VALIDATION_PASSWORD_LETTER = "Incluye al menos una letra.";
export const AUTH_VALIDATION_PASSWORD_NUMBER = "Incluye al menos un número.";

export const PASSWORD_HAS_LETTER = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
export const PASSWORD_HAS_NUMBER = /\d/;

export function getPasswordPolicyError(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return AUTH_VALIDATION_PASSWORD_LENGTH;
  }

  if (!PASSWORD_HAS_LETTER.test(password)) {
    return AUTH_VALIDATION_PASSWORD_LETTER;
  }

  if (!PASSWORD_HAS_NUMBER.test(password)) {
    return AUTH_VALIDATION_PASSWORD_NUMBER;
  }

  return undefined;
}

export function isPasswordPolicyValid(password: string): boolean {
  return getPasswordPolicyError(password) === undefined;
}
