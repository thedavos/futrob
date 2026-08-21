"use client";

import type {
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementSummaryDto,
  ExternalClubDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import { Alert, AlertDescription, AlertTitle, MasterDetail } from "@futrob/ui";
import { LockIcon } from "@phosphor-icons/react";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { TeamDetail } from "./competition-teams-view-detail.tsx";
import { TeamList } from "./competition-teams-view-list.tsx";

export type TeamConsoleCapabilities = {
  readonly manageRoster: boolean;
  readonly manageRoles: boolean;
  readonly manageInvitations: boolean;
  readonly manageExternalClub: boolean;
  readonly manageEntries: boolean;
  readonly unavailable: boolean;
};

export type CompetitionTeamsViewProps = {
  readonly items: readonly CompetitionTeamManagementSummaryDto[];
  readonly detail: CompetitionTeamManagementDetailResponse | null;
  readonly selectedTeamId: string | null;
  readonly loadingList?: boolean;
  readonly loadingDetail?: boolean;
  readonly hasMoreTeams?: boolean;
  readonly loadingMoreTeams?: boolean;
  readonly busy?: boolean;
  readonly error?: SupportError | null;
  readonly capabilities: TeamConsoleCapabilities;
  readonly invitationUrl?: string | null;
  readonly onSelectTeam: (teamId: string | null) => void;
  readonly onLoadMoreTeams?: () => Promise<void>;
  readonly onChangeRole: (membershipId: string, role: RosterMembershipRoleDto) => Promise<void>;
  readonly onSetRosterOpen: (open: boolean) => Promise<void>;
  readonly onCreateInvitation: (input: {
    readonly role: RosterMembershipRoleDto;
    readonly redeemPolicy: "single" | "multi";
  }) => Promise<void>;
  readonly onSearchClubs: (query: string) => Promise<readonly ExternalClubDto[]>;
  readonly onConnectClub: (club: ExternalClubDto) => Promise<void>;
  readonly onDecideEntry: (decision: "approve" | "reject") => Promise<void>;
};

export function CompetitionTeamsView(props: CompetitionTeamsViewProps) {
  return (
    <main
      className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground"
      data-shell-bleed=""
    >
      <header className="flex shrink-0 flex-col gap-2 border-b border-border px-5 py-5 sm:px-8">
        <h1 className="typo-heading">Equipos y plantillas</h1>
        <p className="typo-subtitle max-w-[65ch] text-pretty text-muted-foreground">
          Inscripciones, plantillas y clubes EA.
        </p>
      </header>
      {props.error || props.capabilities.unavailable ? (
        <div className="grid shrink-0 gap-3 px-5 py-5 sm:px-8">
          {props.error ? <SupportErrorAlert error={props.error} /> : null}
          {props.capabilities.unavailable ? (
            <Alert variant="warning">
              <span
                aria-hidden="true"
                className="flex h-6 w-4 shrink-0 items-center justify-center text-warning"
              >
                <LockIcon className="size-4" />
              </span>
              <AlertTitle className="text-base font-normal leading-6">
                Permisos no confirmados
              </AlertTitle>
              <AlertDescription className="text-sm font-normal">
                No se pudieron confirmar. Las acciones están deshabilitadas.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
      <MasterDetail
        detail={<TeamDetail {...props} />}
        master={<TeamList {...props} />}
        selectedId={props.selectedTeamId}
      />
    </main>
  );
}

export { EntryBadge, entryStatusLabel } from "./competition-teams-view-entry.tsx";
export { TeamDetail } from "./competition-teams-view-detail.tsx";
export { TeamList } from "./competition-teams-view-list.tsx";
