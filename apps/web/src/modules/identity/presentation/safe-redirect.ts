/**
 * Same-origin relative app paths only. Blocks open redirects and API/auth
 * surfaces. Invitation deep links (`/invitations/accept/<token>`) are allowed.
 */
export function isSafeAppRedirect(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  if (value.includes("\\")) return false;
  if (value.startsWith("/api/")) return false;
  if (value.startsWith("/login") || value.startsWith("/signup")) return false;
  return true;
}

export function resolveSafeRedirect(value: string | undefined | null): string | null {
  if (value == null || value.length === 0) return null;
  return isSafeAppRedirect(value) ? value : null;
}
