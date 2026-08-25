"use client";

import type {
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementSummaryDto,
  ExternalClubDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  MasterDetail,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { LockIcon } from "@phosphor-icons/react";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { TeamDetail } from "./competition-teams-view-detail.tsx";
import { TeamList } from "./competition-teams-view-list.tsx";

const styles = stylex.create({
  main: {
    display: "flex",
    height: "100%",
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  header: {
    display: "flex",
    flexShrink: 0,
    flexDirection: "column",
    gap: "0.5rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "1.25rem",
  },
  lede: {
    maxWidth: "65ch",
    color: colors.mutedForeground,
  },
  alerts: {
    display: "grid",
    flexShrink: 0,
    gap: "0.75rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "1.25rem",
  },
  lock: {
    display: "flex",
    height: 24,
    width: 16,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    color: colors.warning,
  },
  lockIcon: {
    width: "1rem",
    height: "1rem",
  },
  alertTitle: {
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: "1.5rem",
  },
  alertDescription: {
    fontSize: "0.875rem",
    fontWeight: 400,
  },
});

const alertTitle = applyStyles(styles.alertTitle);
const alertDescription = applyStyles(styles.alertDescription);
const lockIcon = applyStyles(styles.lockIcon);

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
    <main data-shell-bleed="" {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.header)}>
        <h1 {...applyStyles(typography.heading)}>Equipos y plantillas</h1>
        <p {...applyStyles(typography.subtitle, styles.lede)}>
          Inscripciones, plantillas y clubes EA.
        </p>
      </header>
      {props.error || props.capabilities.unavailable ? (
        <div {...applyStyles(styles.alerts)}>
          {props.error ? <SupportErrorAlert error={props.error} /> : null}
          {props.capabilities.unavailable ? (
            <Alert variant="warning">
              <span aria-hidden="true" {...applyStyles(styles.lock)}>
                <LockIcon className={lockIcon.className} style={lockIcon.style} />
              </span>
              <AlertTitle className={alertTitle.className} style={alertTitle.style}>
                Permisos no confirmados
              </AlertTitle>
              <AlertDescription
                className={alertDescription.className}
                style={alertDescription.style}
              >
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
