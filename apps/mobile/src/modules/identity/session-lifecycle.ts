import { clearPendingRosterInvitation } from "./roster-invitation-link.ts";
import type { FutrobApiError } from "@futrob/sdk";
import { signOutRemote, type RemoteSignOutResult } from "./auth-api.ts";
import { clearSession, clearSessionIfCurrent, getSession } from "./session-store.ts";
import { clearOnboardingDraft, clearPendingInvitation } from "./onboarding-draft.ts";
import { bindSentryActor } from "@/observability/sentry";

/**
 * Product 401 handling: drop the local session and return to login.
 * Silent refresh is blocked until a refresh contract exists — never call
 * Better Auth `get-session` to mint a bearer.
 */
export async function onProductUnauthorized(showLogin: () => void): Promise<void> {
  await clearSession();
  await clearOnboardingDraft();
  await clearPendingInvitation();
  await clearPendingRosterInvitation();
  bindSentryActor(null);
  showLogin();
}

/**
 * Product 401 for a request sent with `rejectedToken`: ends that session only. A late 401 for an
 * earlier session leaves whoever signed in since, and their drafts, untouched.
 */
export async function onProductUnauthorizedFor(
  rejectedToken: string,
  showLogin: () => void,
): Promise<void> {
  await clearSessionIfCurrent(rejectedToken);
  if (await getSession()) return;
  await clearOnboardingDraft();
  await clearPendingInvitation();
  await clearPendingRosterInvitation();
  bindSentryActor(null);
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
  await clearOnboardingDraft();
  await clearPendingInvitation();
  await clearPendingRosterInvitation();
  bindSentryActor(null);
  showLogin();
  return remote;
}
