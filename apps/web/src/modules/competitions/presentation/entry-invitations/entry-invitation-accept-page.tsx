"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import {
  useEntryInvitationPreviewQuery,
  useRespondToEntryInvitation,
} from "../entry-invitation-queries.ts";
import type { EntryInvitationReference } from "../entry-invitations-browser-client.ts";
import {
  EntryInvitationAcceptView,
  type EntryInvitationPreviewState,
} from "./entry-invitation-accept-view.tsx";

/** Loads an entry invitation, accepts it with the team name or declines it. */
export function EntryInvitationAcceptPage({
  reference,
}: {
  readonly reference: EntryInvitationReference;
}) {
  const navigate = useNavigate();
  const preview = useEntryInvitationPreviewQuery(reference);
  const respond = useRespondToEntryInvitation(reference);
  // One key per visit: a retried submit returns the same team instead of a second one.
  const [creationKey] = useState(() => crypto.randomUUID());
  const state: EntryInvitationPreviewState = preview.isError
    ? {
        kind: "error",
        error: preview.error instanceof CompetitionsClientError ? preview.error : null,
      }
    : preview.data
      ? { kind: "ready", preview: preview.data }
      : { kind: "loading" };

  function openTeam(competitionId: string) {
    void navigate({
      to: "/player/competitions/$competitionId/team",
      params: { competitionId },
    });
  }

  return (
    <EntryInvitationAcceptView
      onAccept={async (teamName) => {
        const accepted = await respond.accept.mutateAsync({ teamName, creationKey });
        openTeam(accepted.competitionId);
      }}
      onDecline={
        "invitationId" in reference
          ? async () => {
              await respond.decline.mutateAsync(reference.invitationId);
            }
          : undefined
      }
      onOpenCompetition={openTeam}
      platformLabel={competitionPlatformLabel}
      state={state}
    />
  );
}
