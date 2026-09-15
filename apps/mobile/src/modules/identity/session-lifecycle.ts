import type { FutrobApiError } from "@futrob/sdk";
import { signOutRemote, type RemoteSignOutResult } from "./auth-api.ts";
import { clearSession, getSession } from "./session-store.ts";

/**
 * Product 401 handling: drop the local session and return to login.
 * Silent refresh is blocked until a refresh contract exists — never call
 * Better Auth `get-session` to mint a bearer.
 */
export async function onProductUnauthorized(showLogin: () => void): Promise<void> {
  await clearSession();
  showLogin();
}

export function isProductUnauthorized(error: FutrobApiError): boolean {
  return error.status === 401;
}

export async function handleProductError(
  error: FutrobApiError,
  showLogin: () => void,
): Promise<boolean> {
  if (!isProductUnauthorized(error)) return false;
  await onProductUnauthorized(showLogin);
  return true;
}

/** Remote sign-out first, then wipe SecureStore, then show login. */
export async function logout(showLogin: () => void): Promise<RemoteSignOutResult> {
  const session = await getSession();
  const remote: RemoteSignOutResult = session ? await signOutRemote(session.token) : { ok: true };
  await clearSession();
  showLogin();
  return remote;
}
