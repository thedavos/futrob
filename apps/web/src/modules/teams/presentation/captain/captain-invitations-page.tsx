"use client";

import { useState } from "react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCreateRosterInvitationMutation } from "../competition-team-queries.ts";
import { rosterInvitationLink } from "../roster-invitation-link.ts";
import { teamConsoleError } from "../team-console-error.ts";
import { captainLinks } from "./captain-links.tsx";
import { CaptainInvitationsPageView } from "./captain-invitations-page-view.tsx";
import { useCaptainTeam } from "./use-captain-team.ts";
import { useCaptainTeamDetail } from "./use-captain-team-detail.ts";

export function CaptainInvitationsPage({
  competitionId,
  organizationId,
}: Readonly<{ competitionId: string; organizationId: string | null }>) {
  const { t } = useI18n();
  const { access, capabilities, retry } = useCaptainTeam({
    competitionId,
    organizationId,
    required: "manageInvitations",
  });
  const { scope, detail } = useCaptainTeamDetail(access);
  const createInvitation = useCreateRosterInvitationMutation(scope);
  const [created, setCreated] = useState<{ teamId: string; url: string } | null>(null);
  const error = detail.error ?? createInvitation.error;

  return (
    <CaptainInvitationsPageView
      access={access}
      busy={createInvitation.isPending}
      capabilities={capabilities}
      detail={detail.data ?? null}
      error={error ? teamConsoleError(error, t) : null}
      // A link belongs to the team it was created for; never show it under another one.
      invitationUrl={created?.teamId === scope.teamId ? created.url : null}
      links={captainLinks(organizationId, competitionId)}
      onCreateInvitation={async (input) => {
        createInvitation.reset();
        const invitation = await createInvitation.mutateAsync(input);
        setCreated({ teamId: invitation.teamId, url: rosterInvitationLink(invitation.token) });
      }}
      onRetry={retry}
      onRetryDetail={() => {
        createInvitation.reset();
        void detail.refetch();
      }}
    />
  );
}
