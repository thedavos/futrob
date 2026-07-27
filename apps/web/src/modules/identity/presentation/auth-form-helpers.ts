import type { AuthFormField } from "@/modules/identity/presentation/auth-form-state.ts";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export interface AuthClientError {
  code?: string;
  status: number;
}

export function readString(formData: FormData, field: AuthFormField): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
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
export const AUTH_VALIDATION_PASSWORD_MIN = "La contraseña debe tener al menos 8 caracteres.";
