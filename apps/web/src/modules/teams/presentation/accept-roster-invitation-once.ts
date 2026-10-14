import type { AcceptRosterInvitationResponse } from "@futrob/api-contracts";
import { isRedirect, redirect } from "@tanstack/react-router";
import { createRunOnceByKey } from "@/shared/presentation/run-once-by-key.ts";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import { TeamsClientError, teamsBrowserClient } from "./teams-browser-client.ts";

const once = createRunOnceByKey<AcceptRosterInvitationResponse>();

/**
 * POST roster accept for a deep-link token, at most once per token until forget.
 * The product API is idempotent for the same actor (already on the roster returns that membership).
 */
export function acceptRosterInvitationOnce(token: string): Promise<AcceptRosterInvitationResponse> {
  return once.run(token, () => teamsBrowserClient.acceptRosterInvitation({ token }));
}

export function forgetRosterInvitationAccept(token: string): void {
  once.forget(token);
}

export function resetRosterInvitationAcceptOnceForTests(): void {
  once.clear();
}

export function rosterInvitationErrorMessage(code: string): string {
  switch (code) {
    case "teams.roster_invitation_not_found":
      return "No encontramos esa invitación a la plantilla.";
    case "teams.roster_invitation_expired":
      return "La invitación a la plantilla ha caducado.";
    case "teams.roster_invitation_revoked":
      return "La invitación a la plantilla fue revocada.";
    case "teams.roster_full":
      return "La plantilla ya está completa.";
    case "teams.roster_competition_conflict":
      return "Ya perteneces a otro equipo en esta competición.";
    case "teams.roster_locked":
      return "La plantilla está cerrada para esta competición.";
    case "teams.roster_invitation_invalid":
      return "La invitación a la plantilla ya no es válida.";
    default:
      return "No se pudo unirte a la plantilla. Inténtalo de nuevo.";
  }
}

export function rosterInvitationAcceptFailure(error: Error | null): SupportError {
  if (error instanceof TeamsClientError) {
    return {
      message: error.retryAfterSeconds
        ? "Alcanzaste el límite temporal de invitaciones."
        : rosterInvitationErrorMessage(error.code),
      requestId: error.requestId,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return { message: rosterInvitationErrorMessage("unknown") };
}

export type RosterInvitationAcceptLoaderResult =
  | { readonly kind: "preload" }
  | { readonly kind: "error"; readonly error: SupportError };

export async function loadRosterInvitationAccept(
  token: string,
  preload: boolean,
): Promise<RosterInvitationAcceptLoaderResult> {
  if (preload) return { kind: "preload" };
  try {
    await acceptRosterInvitationOnce(token);
    throw redirect({ to: "/player", replace: true });
  } catch (caught) {
    if (isRedirect(caught)) throw caught;
    return {
      kind: "error",
      error: rosterInvitationAcceptFailure(caught instanceof Error ? caught : null),
    };
  }
}
