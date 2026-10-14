import type { AcceptCompetitionInvitationResponse } from "@futrob/api-contracts";
import { isRedirect, redirect } from "@tanstack/react-router";
import { createRunOnceByKey } from "@/shared/presentation/run-once-by-key.ts";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import { invitationAcceptErrorMessage } from "./invitation-accept-errors.ts";
import {
  OrganizationsClientError,
  organizationsBrowserClient,
} from "./organizations-browser-client.ts";

const once = createRunOnceByKey<AcceptCompetitionInvitationResponse>();

/**
 * POST accept for a deep-link token, at most once per token until `forgetInvitationAccept`.
 * The product API is idempotent for the same actor (re-accept returns the membership, not an error).
 */
export function acceptInvitationOnce(token: string): Promise<AcceptCompetitionInvitationResponse> {
  return once.run(token, () => organizationsBrowserClient.acceptInvitation({ token }));
}

export function forgetInvitationAccept(token: string): void {
  once.forget(token);
}

export function resetInvitationAcceptOnceForTests(): void {
  once.clear();
}

export function competitionInvitationRedirect(accepted: AcceptCompetitionInvitationResponse) {
  return {
    to: "/orgs/$orgId/competitions/$competitionId",
    params: {
      orgId: accepted.destination.organizationId,
      competitionId: accepted.destination.competitionId,
    },
    replace: true,
  } as const;
}

export function invitationAcceptFailure(error: Error | null): SupportError {
  if (error instanceof OrganizationsClientError) {
    return {
      message: error.retryAfterSeconds
        ? "Alcanzaste el límite temporal de invitaciones."
        : invitationAcceptErrorMessage(error),
      requestId: error.requestId,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return { message: invitationAcceptErrorMessage(null) };
}

export type InvitationAcceptLoaderResult =
  | { readonly kind: "preload" }
  | { readonly kind: "error"; readonly error: SupportError };

export async function loadCompetitionInvitationAccept(
  token: string,
  preload: boolean,
): Promise<InvitationAcceptLoaderResult> {
  if (preload) return { kind: "preload" };
  try {
    const accepted = await acceptInvitationOnce(token);
    throw redirect(competitionInvitationRedirect(accepted));
  } catch (caught) {
    if (isRedirect(caught)) throw caught;
    return {
      kind: "error",
      error: invitationAcceptFailure(caught instanceof Error ? caught : null),
    };
  }
}
