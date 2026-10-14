"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { buildEntryInvitationShareUrl, buildWhatsAppShareUrl } from "@futrob/sdk";
import { hasBrowserWindow } from "@futrob/ui";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import {
  useEntryInvitationCommands,
  useEntryInvitationLinkQuery,
  useSentEntryInvitationsQuery,
} from "../entry-invitation-queries.ts";
import { entryInvitationShareText } from "./entry-invitation-copy.ts";
import { INVITE_TEAM_TAB, InviteTeamDialog, type InviteTeamTab } from "./invite-team-dialog.tsx";
import type { InvitationLinkState } from "./invite-team-link-tab.tsx";
import { SentEntryInvitations } from "./sent-entry-invitations.tsx";

export interface InviteTeamAction {
  readonly onOpen: () => void;
  /** Why the action is unavailable, or null when the organizer may invite. */
  readonly disabledReason: string | null;
}

export interface CompetitionEntryInvitations {
  readonly invite: InviteTeamAction | null;
  readonly dialog: ReactNode;
  readonly sentInvitations: ReactNode;
}

/**
 * Server state of the competition's entry invitations for the participants step: the
 * invite action, the dialog and the list of sent invitations.
 */
export function useCompetitionEntryInvitations(input: {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly competition: {
    readonly name: string;
    readonly gameEdition: string;
    readonly platform: GamePlatformDto;
  };
  readonly canInvite: boolean;
  readonly participantsLocked: boolean;
}): CompetitionEntryInvitations {
  const { organizationId, competitionId, competition } = input;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<InviteTeamTab>(INVITE_TEAM_TAB.futrob);
  const commands = useEntryInvitationCommands(organizationId, competitionId);
  const sent = useSentEntryInvitationsQuery(organizationId, competitionId, input.canInvite);
  const link = useEntryInvitationLinkQuery(
    organizationId,
    competitionId,
    open && tab === INVITE_TEAM_TAB.link && !input.participantsLocked,
  );
  const searchPlayers = useCallback(
    async (query: string) => (await commands.search(query)).players,
    [commands.search],
  );

  if (!input.canInvite) {
    return { invite: null, dialog: null, sentInvitations: null };
  }

  const origin = hasBrowserWindow() ? window.location.origin : "";
  const linkState: InvitationLinkState = link.isError
    ? {
        kind: "error",
        error: link.error instanceof CompetitionsClientError ? link.error : null,
      }
    : link.data
      ? linkReady(origin, link.data.link.code, competition.name)
      : { kind: "loading" };

  return {
    invite: {
      onOpen: () => setOpen(true),
      disabledReason: input.participantsLocked
        ? "La competición ya no admite equipos nuevos."
        : null,
    },
    dialog: (
      <InviteTeamDialog
        competitionName={competition.name}
        gameEdition={competition.gameEdition}
        link={linkState}
        onInvite={async (invitation) => {
          await commands.invite.mutateAsync(invitation);
        }}
        onOpenChange={setOpen}
        onRegenerateLink={async () => {
          await commands.regenerateLink.mutateAsync();
        }}
        onRetryLink={() => void link.refetch()}
        onTabChange={setTab}
        open={open}
        platform={competition.platform}
        platformLabel={competitionPlatformLabel}
        searchPlayers={searchPlayers}
        tab={tab}
      />
    ),
    sentInvitations: (
      <SentEntryInvitations
        disabled={commands.revoke.isPending}
        invitations={sent.data?.invitations ?? []}
        now={new Date()}
        onRevoke={(invitationId) => commands.revoke.mutate(invitationId)}
      />
    ),
  };
}

function linkReady(origin: string, code: string, competitionName: string): InvitationLinkState {
  const url = buildEntryInvitationShareUrl(origin, code);
  return {
    kind: "ready",
    url,
    whatsAppUrl: buildWhatsAppShareUrl(entryInvitationShareText(competitionName), url),
  };
}
