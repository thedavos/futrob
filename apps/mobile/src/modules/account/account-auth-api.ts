import { authSessionListSchema, type AuthSession } from "@futrob/sdk";
import { AUTH_BASE_URL, AUTH_ORIGIN } from "@/config/env";
import { z } from "zod";
import { getSession, replaceSessionTokenIfCurrent } from "@/modules/identity/session-store";

/**
 * Better Auth account endpoints (`/api/auth/*`) called with this device's bearer. Revoking a
 * session deletes it on the server, so it stops working at once on web and mobile alike.
 */
export class AccountAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status?: number,
  ) {
    super(code);
    this.name = "AccountAuthError";
  }
}

const authErrorCodeSchema = z.object({ code: z.string() });

async function callAuth(path: string, init: { method: "GET" | "POST"; body?: unknown }) {
  const session = await getSession();
  if (!session) throw new AccountAuthError("auth.signed_out", 401);
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${session.token}`,
    // Expo Go sends Origin: exp://…; Better Auth only trusts HTTP origins.
    Origin: AUTH_ORIGIN,
  });
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${AUTH_BASE_URL}${path}`, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new AccountAuthError("auth.network");
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = authErrorCodeSchema.safeParse(payload);
    const code = parsed.success ? parsed.data.code : "auth.request_failed";
    throw new AccountAuthError(code, response.status);
  }
  return { payload, token: session.token };
}

export interface DeviceSessions {
  readonly sessions: readonly AuthSession[];
  /** The bearer this device holds; it is the token of its own session. */
  readonly currentToken: string;
}

export async function listDeviceSessions(): Promise<DeviceSessions> {
  const { payload, token } = await callAuth("/list-sessions", { method: "GET" });
  return { sessions: authSessionListSchema.parse(payload ?? []), currentToken: token };
}

export async function revokeDeviceSession(token: string): Promise<void> {
  await callAuth("/revoke-session", { method: "POST", body: { token } });
}

export async function revokeOtherDeviceSessions(): Promise<void> {
  await callAuth("/revoke-other-sessions", { method: "POST" });
}

export async function changeAccountPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { payload, token } = await callAuth("/change-password", {
    method: "POST",
    body: { ...input, revokeOtherSessions: true },
  });
  // Revoking the other sessions also replaces this one; keep the new bearer or the next call
  // would sign this device out too. Only the session that sent the request may take it.
  const parsed = changePasswordResponseSchema.safeParse(payload);
  if (parsed.success && parsed.data.token) {
    await replaceSessionTokenIfCurrent(token, parsed.data.token);
  }
}

const changePasswordResponseSchema = z.object({ token: z.string().min(1).nullish() });

/** Sends a confirmation link to `newEmail`; the current address stays valid until it is opened. */
export async function requestAccountEmailChange(newEmail: string): Promise<void> {
  await callAuth("/change-email", {
    method: "POST",
    body: { newEmail, callbackURL: "/player/profile" },
  });
}

/** Where every verification link lands: the web page opens in any browser (apps/auth). */
const EMAIL_VERIFICATION_CALLBACK = "/verify-email";

const emailStatusSchema = z
  .object({ user: z.object({ email: z.string(), emailVerified: z.boolean() }) })
  .nullable();

export interface AccountEmailStatus {
  readonly email: string;
  readonly verified: boolean;
}

/** Whether the signed-in account confirmed its email (AUTH-02); `null` when signed out. */
export async function getAccountEmailStatus(): Promise<AccountEmailStatus | null> {
  const { payload } = await callAuth("/get-session", { method: "GET" });
  const parsed = emailStatusSchema.parse(payload);
  return parsed === null ? null : { email: parsed.user.email, verified: parsed.user.emailVerified };
}

/** Sends another verification link to the signed-in account's email. */
export async function resendEmailVerification(email: string): Promise<void> {
  await callAuth("/send-verification-email", {
    method: "POST",
    body: { email, callbackURL: EMAIL_VERIFICATION_CALLBACK },
  });
}
