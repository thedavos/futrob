import { getFutrobClient } from "@/modules/api/futrob-client";
import { createRunOnceByKey } from "@/modules/query/run-once-by-key";
import { clearPendingInvitation, savePendingInvitation } from "./onboarding-draft";
import { resolveSessionGate } from "./session-gate";

export type InvitationLinkAcceptState =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "ready"; readonly route: string }
  | { readonly status: "error" };

const once = createRunOnceByKey<{ readonly route: string }>();
const snapshots = new Map<string, InvitationLinkAcceptState>();
const listeners = new Map<string, Set<() => void>>();

function emit(token: string): void {
  const tokenListeners = listeners.get(token);
  if (!tokenListeners) return;
  for (const listener of tokenListeners) listener();
}

/**
 * POST accept for a native deep-link, at most once per token until retry.
 * The product API is idempotent for the same actor (re-accept returns the membership).
 */
export async function acceptInvitationLink(token: string): Promise<{ readonly route: string }> {
  await savePendingInvitation(token);
  const gate = await resolveSessionGate();
  if (gate.kind === "error") {
    throw new Error("gate");
  }
  if (gate.kind === "ready") {
    const accepted = await getFutrobClient().competitions.acceptInvitation({ token });
    await clearPendingInvitation();
    return {
      route: `/orgs/${encodeURIComponent(accepted.destination.organizationId)}/competitions/${encodeURIComponent(accepted.destination.competitionId)}`,
    };
  }
  return { route: gate.route };
}

export function getInvitationLinkAccept(token: string): InvitationLinkAcceptState {
  return snapshots.get(token) ?? { status: "idle" };
}

export function startInvitationLinkAccept(token: string): void {
  if (token.length === 0) {
    snapshots.set(token, { status: "error" });
    emit(token);
    return;
  }
  const current = snapshots.get(token);
  if (current && current.status !== "idle") return;
  snapshots.set(token, { status: "pending" });
  emit(token);
  void once
    .run(token, () => acceptInvitationLink(token))
    .then(
      (result) => {
        snapshots.set(token, { status: "ready", route: result.route });
        emit(token);
      },
      () => {
        snapshots.set(token, { status: "error" });
        emit(token);
      },
    );
}

export function retryInvitationLinkAccept(token: string): void {
  once.forget(token);
  snapshots.delete(token);
  startInvitationLinkAccept(token);
}

export function subscribeInvitationLinkAccept(token: string, onChange: () => void): () => void {
  const tokenListeners = listeners.get(token) ?? new Set<() => void>();
  tokenListeners.add(onChange);
  listeners.set(token, tokenListeners);
  startInvitationLinkAccept(token);
  return () => {
    tokenListeners.delete(onChange);
    if (tokenListeners.size === 0) listeners.delete(token);
  };
}

export function resetInvitationLinkAcceptForTests(): void {
  once.clear();
  snapshots.clear();
  listeners.clear();
}
