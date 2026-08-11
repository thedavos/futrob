"use client";

import { useState } from "react";
import { buildRosterInvitationShareUrl } from "@futrob/sdk";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import type { ExternalClubDto, RosterMembershipRoleDto } from "@futrob/api-contracts";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import { useSearchClubsMutation } from "@/modules/game-data/presentation/game-data-queries.ts";
import { GameDataClientError } from "@/modules/game-data/presentation/game-data-browser-client.ts";
import {
  useChangeRosterRoleMutation,
  useCompetitionTeamManagementDetailQuery,
  useCompetitionTeamManagementQuery,
  useConnectExternalClubMutation,
  useCreateRosterInvitationMutation,
  useDecideTeamEntryMutation,
  useSetRosterOpenMutation,
} from "./competition-team-queries.ts";
import { TeamsClientError } from "./teams-browser-client.ts";
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
      error={error ? teamConsoleError(error) : null}
      invitationUrl={invitation?.teamId === selectedTeamId ? invitation.url : null}
      items={list.data?.items ?? []}
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
        const origin =
          typeof window === "undefined" ? "https://futrob.app" : window.location.origin;
        setInvitation({
          teamId: created.teamId,
          url: buildRosterInvitationShareUrl(origin, created.token),
        });
      }}
      onDecideEntry={async (decision) => {
        if (!detail.data) return;
        await decideEntry.mutateAsync({ entryId: detail.data.entry.id, decision });
      }}
      onSearchClubs={async (query) => {
        const result = await searchClubs.mutateAsync({
          query,
          providerKey: "ea-clubs",
          platform: "common-gen5",
          gameEdition: "fc26",
        });
        return result.clubs;
      }}
      onSelectTeam={onSelectTeam}
      onSetRosterOpen={async (open) => {
        await setRosterOpen.mutateAsync(open);
      }}
      selectedTeamId={selectedTeamId}
    />
  );
}

export function teamConsoleError(error: unknown): SupportError {
  if (error instanceof TeamsClientError) {
    return {
      message: errorCopy(error.code),
      requestId: error.requestId,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  if (error instanceof GameDataClientError) {
    return {
      message: errorCopy(error.code),
      requestId: error.requestId,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return { message: "No pudimos completar la operación. Revisa tu conexión e inténtalo de nuevo." };
}

function errorCopy(code: string): string {
  if (code === "teams.roster_full") return "La plantilla ya alcanzó su cupo máximo.";
  if (code === "teams.roster_locked")
    return "La plantilla está cerrada. Ábrela antes de invitar jugadores.";
  if (code === "teams.roster_competition_conflict")
    return "Ese jugador ya pertenece a otro Team en esta competición.";
  if (code === "authorization.forbidden")
    return "No tienes permiso para operar este Team o esta competición.";
  if (code.includes("expired")) return "La invitación ya expiró. Crea un enlace nuevo.";
  if (code.includes("network"))
    return "No pudimos conectar con Futrob. Conservamos tu contexto para que puedas reintentar.";
  return "No pudimos completar la operación. Inténtalo nuevamente.";
}
