import { buildRosterInvitationShareUrl } from "@futrob/sdk";
import { hasBrowserWindow } from "@futrob/ui";

/** Link a captain shares with the invited player. The token never leaves memory or the clipboard. */
export function rosterInvitationLink(token: string): string {
  const origin = hasBrowserWindow() ? window.location.origin : "https://futrob.app";
  return buildRosterInvitationShareUrl(origin, token);
}
