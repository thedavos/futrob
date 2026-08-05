/**
 * Builds the canonical browser URL for a roster invitation deep link.
 * Clients construct this locally; the API does not return shareUrl.
 */
export function buildRosterInvitationShareUrl(origin: string, token: string): string {
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return `${base}/roster-invitations/accept/${encodeURIComponent(token)}`;
}
