"use client";

import { authClient } from "@/modules/identity/auth-client.ts";
import { PrivateContentGate } from "@/modules/identity/presentation/private-content-gate.tsx";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { usePublicEntryInvitationLinkQuery } from "../entry-invitation-queries.ts";
import { EntryInvitationAcceptPage } from "./entry-invitation-accept-page.tsx";
import {
  EntryInvitationPublicView,
  type PublicEntryInvitationState,
} from "./entry-invitation-public-view.tsx";

/**
 * A shared invitation link: the accept form for a signed-in player, otherwise the public
 * preview with a way into an account that comes back here.
 */
export function EntryInvitationLinkPage({ code }: { readonly code: string }) {
  const session = authClient.useSession();
  const redirectTo = `/entry-invitations/link/${encodeURIComponent(code)}`;

  if (session.isPending) {
    return (
      <EntryInvitationPublicView
        onRetry={() => undefined}
        platformLabel={competitionPlatformLabel}
        redirectTo={redirectTo}
        state={{ kind: "loading" }}
      />
    );
  }
  if (session.data?.user != null) {
    return (
      <PrivateContentGate>
        <EntryInvitationAcceptPage reference={{ code }} />
      </PrivateContentGate>
    );
  }
  return <PublicEntryInvitationLink code={code} redirectTo={redirectTo} />;
}

function PublicEntryInvitationLink({
  code,
  redirectTo,
}: {
  readonly code: string;
  readonly redirectTo: string;
}) {
  const query = usePublicEntryInvitationLinkQuery(code);
  const state: PublicEntryInvitationState = query.isError
    ? {
        kind: "error",
        error: query.error instanceof CompetitionsClientError ? query.error : null,
      }
    : query.data
      ? { kind: "ready", link: query.data }
      : { kind: "loading" };

  return (
    <EntryInvitationPublicView
      onRetry={() => void query.refetch()}
      platformLabel={competitionPlatformLabel}
      redirectTo={redirectTo}
      state={state}
    />
  );
}
