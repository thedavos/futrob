/**
 * Browser URL of a competition's invitation link. Clients build it locally; the API only
 * returns the code.
 */
export function buildEntryInvitationShareUrl(origin: string, code: string): string {
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return `${base}/entry-invitations/link/${encodeURIComponent(code)}`;
}

/** WhatsApp share intent with the invitation text followed by its link. */
export function buildWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
