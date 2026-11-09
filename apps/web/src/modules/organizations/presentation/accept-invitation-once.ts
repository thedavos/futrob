import type { AcceptCompetitionInvitationResponse } from "@futrob/api-contracts";
import { isRedirect, redirect } from "@tanstack/react-router";
import { createRunOnceByKey } from "@/shared/presentation/run-once-by-key.ts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
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

/**
 * A failed accept as loader data. Loaders have no translator, so catalog copy travels as a
 * key and `localizeInvitationAcceptFailure` resolves it while rendering.
 */
export type InvitationAcceptFailure = Omit<SupportError, "message"> &
  (
    | { readonly kind: "text"; readonly message: string }
    | { readonly kind: "catalog"; readonly messageKey: ParameterlessMessageKey }
  );

export function invitationAcceptFailure(error: Error | null): InvitationAcceptFailure {
  if (error instanceof OrganizationsClientError) {
    const support = { requestId: error.requestId, retryAfterSeconds: error.retryAfterSeconds };
    return error.retryAfterSeconds
      ? { kind: "catalog", messageKey: "invitations.accept.rateLimited", ...support }
      : { kind: "text", message: invitationAcceptErrorMessage(error), ...support };
  }
  return { kind: "text", message: invitationAcceptErrorMessage(null) };
}

export function localizeInvitationAcceptFailure(
  failure: InvitationAcceptFailure,
  t: Translator,
): SupportError {
  return {
    message: failure.kind === "catalog" ? t(failure.messageKey) : failure.message,
    requestId: failure.requestId,
    retryAfterSeconds: failure.retryAfterSeconds,
  };
}

export type InvitationAcceptLoaderResult =
  | { readonly kind: "preload" }
  | { readonly kind: "error"; readonly error: InvitationAcceptFailure };

/**
 * `beforeAccept` runs first and may redirect elsewhere; if it fails, the link is not redeemed
 * and the page offers a retry.
 */
export async function loadCompetitionInvitationAccept(
  token: string,
  preload: boolean,
  beforeAccept?: () => Promise<void>,
): Promise<InvitationAcceptLoaderResult> {
  if (preload) return { kind: "preload" };
  try {
    await beforeAccept?.();
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
