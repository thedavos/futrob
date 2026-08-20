import { hasBrowserWindow } from "@futrob/ui";

/** Canonical access-invitation deep link path (plain token is base64url). */
export function invitationAcceptPath(plainToken: string): string {
  return `/invitations/accept/${plainToken}`;
}

/** Client-built share URL. Create API still returns only `token`. */
export function buildInvitationShareUrl(
  plainToken: string,
  origin: string = hasBrowserWindow() ? window.location.origin : "",
): string {
  return `${origin}${invitationAcceptPath(plainToken)}`;
}

/** Strip invitation tokens from pathnames before any telemetry or logs. */
export function redactInvitationTokenFromPath(pathname: string): string {
  return pathname.replace(/^(\/invitations\/accept\/)[^/]+(?=\/|$)/, "$1:token");
}
