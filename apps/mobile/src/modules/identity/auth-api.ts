import { z } from "zod";
import { AUTH_BASE_URL } from "@/config/env";

/**
 * Better Auth email/password endpoints served by apps/auth (`/api/auth/*`).
 * Wire payloads are parsed at this boundary; screens only see typed values.
 */

export const AUTH_ERROR_NETWORK = "No se pudo conectar. Revisa tu conexión e intenta de nuevo.";
export const AUTH_ERROR_GENERIC = "No se pudo completar. Intenta de nuevo.";

const authSuccessSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    name: z.string(),
    email: z.string(),
  }),
});

const authErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

interface AuthErrorOptions {
  readonly code?: string;
  readonly status?: number;
  readonly network?: boolean;
}

export class AuthError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly network?: boolean;

  constructor(message: string, options: AuthErrorOptions = {}) {
    super(message);
    this.name = "AuthError";
    this.code = options.code;
    this.status = options.status;
    this.network = options.network;
  }
}

const WRONG_CREDENTIALS_CODES = new Set([
  "CREDENTIAL_ACCOUNT_NOT_FOUND",
  "INVALID_EMAIL",
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_PASSWORD",
  "USER_NOT_FOUND",
]);

function mapErrorMessage(code: string | undefined): string {
  if (code === undefined) {
    return AUTH_ERROR_GENERIC;
  }
  if (WRONG_CREDENTIALS_CODES.has(code)) {
    return "El correo o la contraseña no son correctos.";
  }
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "Ya existe una cuenta con este correo.";
  }
  if (code === "PASSWORD_TOO_SHORT") {
    return "Usa al menos 8 caracteres.";
  }
  return AUTH_ERROR_GENERIC;
}

export interface AuthSuccess {
  token: string;
  user: { id: string; name: string; email: string };
}

async function requestAuth(
  path: string,
  body: { email: string; password: string },
): Promise<AuthSuccess> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError(AUTH_ERROR_NETWORK, { network: true });
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = authErrorSchema.safeParse(payload);
    const code = parsedError.success ? parsedError.data.code : undefined;
    throw new AuthError(mapErrorMessage(code), { code, status: response.status });
  }

  const parsedSuccess = authSuccessSchema.safeParse(payload);
  if (!parsedSuccess.success) {
    throw new AuthError(AUTH_ERROR_GENERIC, { status: response.status });
  }
  return parsedSuccess.data;
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signInEmail(input: SignInInput): Promise<AuthSuccess> {
  return requestAuth("/sign-in/email", input);
}

export interface SignUpInput extends SignInInput {
  name: string;
}

export async function signUpEmail(input: SignUpInput): Promise<AuthSuccess> {
  return requestAuth("/sign-up/email", input);
}

/**
 * Remote Better Auth sign-out. Local SecureStore is cleared by the caller
 * after this returns. Does not mint a new bearer. Failures are returned,
 * never swallowed, so logout can still wipe local credentials.
 */
export type RemoteSignOutResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly network: boolean; readonly status?: number };

export async function signOutRemote(token: string): Promise<RemoteSignOutResult> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_BASE_URL}/sign-out`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return { ok: false, network: true };
  }
  if (!response.ok) {
    return { ok: false, network: false, status: response.status };
  }
  return { ok: true };
}
