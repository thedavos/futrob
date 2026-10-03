"use client";

import { useState } from "react";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import type { ExternalClubDto, RosterMembershipRoleDto } from "@futrob/api-contracts";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useSearchClubsMutation } from "@/modules/game-data/presentation/game-data-queries.ts";
import {
  useChangeRosterRoleMutation,
  useCompetitionTeamManagementDetailQuery,
  useCompetitionTeamManagementQuery,
  useConnectExternalClubMutation,
  useCreateRosterInvitationMutation,
  useDecideTeamEntryMutation,
  useSetRosterOpenMutation,
} from "./competition-team-queries.ts";
import { rosterInvitationLink } from "./roster-invitation-link.ts";
import { teamConsoleError } from "./team-console-error.ts";
import { CompetitionTeamsView, type TeamConsoleCapabilities } from "./competition-teams-view.tsx";

const CONSOLE_CAPABILITIES = {
  manageRoster: TEAM_PERMISSION.rosterManage,
  manageRoles: TEAM_PERMISSION.rosterRolesManage,
  manageInvitations: TEAM_PERMISSION.invitationsManage,
  manageExternalClub: TEAM_PERMISSION.externalClubManage,
  manageEntries: COMPETITION_PERMISSION.participantsManage,
} as const;

export function CompetitionTeamsConsole({
  organizationId,
  competitionId,
  selectedTeamId,
  onSelectTeam,
}: Readonly<{
  organizationId: string;
  competitionId: string;
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string | null) => void;
}>) {
  const { t } = useI18n();
  const list = useCompetitionTeamManagementQuery(organizationId, competitionId);
  const detail = useCompetitionTeamManagementDetailQuery(
    organizationId,
    competitionId,
    selectedTeamId,
  );
  const scope = { organizationId, competitionId, teamId: selectedTeamId ?? "" };
  const caps = useCapabilities(
    { organizationId, competitionId, teamId: selectedTeamId ?? undefined },
    CONSOLE_CAPABILITIES,
  );
  const changeRole = useChangeRosterRoleMutation(scope);
  const setRosterOpen = useSetRosterOpenMutation(scope);
  const createInvitation = useCreateRosterInvitationMutation(scope);
  const connectClub = useConnectExternalClubMutation(scope);
  const decideEntry = useDecideTeamEntryMutation(
    organizationId,
    competitionId,
    selectedTeamId ?? "",
  );
  const searchClubs = useSearchClubsMutation();
  const [invitation, setInvitation] = useState<{ teamId: string; url: string } | null>(null);
  const mutationError =
    changeRole.error ??
    setRosterOpen.error ??
    createInvitation.error ??
    connectClub.error ??
    decideEntry.error ??
    searchClubs.error;
  const error = list.error ?? detail.error ?? mutationError;
  const busy =
    changeRole.isPending ||
    setRosterOpen.isPending ||
    createInvitation.isPending ||
    connectClub.isPending ||
    decideEntry.isPending;

  const capabilities: TeamConsoleCapabilities = {
    manageRoster: caps.manageRoster && !caps.loading && !caps.unavailable,
    manageRoles: caps.manageRoles && !caps.loading && !caps.unavailable,
    manageInvitations: caps.manageInvitations && !caps.loading && !caps.unavailable,
    manageExternalClub: caps.manageExternalClub && !caps.loading && !caps.unavailable,
    manageEntries: caps.manageEntries && !caps.loading && !caps.unavailable,
    unavailable: caps.unavailable,
  };

  return (
    <CompetitionTeamsView
      busy={busy}
      capabilities={capabilities}
      detail={detail.data ?? null}
      error={error ? teamConsoleError(error, t) : null}
      invitationUrl={invitation?.teamId === selectedTeamId ? invitation.url : null}
      hasMoreTeams={list.hasNextPage}
      items={list.data?.pages.flatMap((page) => page.items) ?? []}
      loadingMoreTeams={list.isFetchingNextPage}
      loadingDetail={detail.isLoading}
      loadingList={list.isLoading}
      onChangeRole={async (membershipId: string, role: RosterMembershipRoleDto) => {
        await changeRole.mutateAsync({ membershipId, role });
      }}
      onConnectClub={async (club: ExternalClubDto) => {
        await connectClub.mutateAsync({
          providerKey: club.providerKey,
          externalClubId: club.externalClubId,
          externalClubName: club.name,
          platform: club.platform,
          gameEdition: club.gameEdition,
        });
      }}
      onCreateInvitation={async (input) => {
        const created = await createInvitation.mutateAsync(input);
        setInvitation({ teamId: created.teamId, url: rosterInvitationLink(created.token) });
      }}
      onDecideEntry={async (decision) => {
        if (!detail.data) return;
        await decideEntry.mutateAsync({ entryId: detail.data.entry.id, decision });
      }}
      onSearchClubs={async (query) => {
        const result = await searchClubs.mutateAsync({
          query,
          providerKey: "ea-clubs",
        });
        return result.clubs;
      }}
      onSelectTeam={onSelectTeam}
      onLoadMoreTeams={async () => {
        await list.fetchNextPage();
      }}
      onSetRosterOpen={async (open) => {
        await setRosterOpen.mutateAsync(open);
      }}
      selectedTeamId={selectedTeamId}
    />
  );
}
