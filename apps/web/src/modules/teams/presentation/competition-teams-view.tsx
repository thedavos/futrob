"use client";

import { useState } from "react";
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
  Card,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { LockIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { CompetitionTeamsKpis } from "./competition-teams-kpis.tsx";
import {
  summarizeCompetitionTeams,
  type CompetitionTeamsFilter,
} from "./competition-teams-model.ts";
import { TeamDetail } from "./competition-teams-view-detail.tsx";
import { TeamList } from "./competition-teams-view-list.tsx";

const styles = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
    color: colors.foreground,
  },
  header: {
    marginBottom: 0,
  },
  alerts: {
    display: "grid",
    gap: "0.75rem",
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
  split: {
    display: "grid",
    minWidth: 0,
    gap: "1rem",
    alignItems: "start",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "20rem minmax(0, 1fr)",
      [media.lg]: "22rem minmax(0, 1fr)",
    },
  },
  panelVisible: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  panelHiddenOnMobile: {
    display: {
      default: "none",
      [media.md]: "flex",
    },
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  // Desktop: the detail stays in view while the list scrolls inside the shell's <main>
  // (command bar 3.5rem + 1.5rem block padding on each side).
  detailPanel: {
    flexDirection: "column",
    minWidth: 0,
    position: { default: null, [media.md]: "sticky" },
    top: { default: null, [media.md]: 0 },
    alignSelf: { default: null, [media.md]: "start" },
    maxHeight: { default: null, [media.md]: "calc(100svh - 6.5rem)" },
    overflowX: "hidden",
    overflowY: { default: "hidden", [media.md]: "auto" },
  },
  detailPanelVisible: {
    display: "flex",
  },
  detailPanelHiddenOnMobile: {
    display: { default: "none", [media.md]: "flex" },
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
    readonly inviteeIdentifier: string | null;
    readonly message: string | null;
  }) => Promise<void>;
  readonly onSearchClubs: (query: string) => Promise<readonly ExternalClubDto[]>;
  readonly onConnectClub: (club: ExternalClubDto) => Promise<void>;
  readonly onDecideEntry: (decision: "approve" | "reject") => Promise<void>;
};

export function CompetitionTeamsView(props: CompetitionTeamsViewProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CompetitionTeamsFilter>("all");
  const summary = summarizeCompetitionTeams(props.items);
  const showDetailMobile = props.selectedTeamId !== null && props.selectedTeamId !== "";
  const showKpis = Boolean(props.loadingList) || props.items.length > 0;

  return (
    <main aria-busy={props.loadingList || undefined} {...applyStyles(styles.main)}>
      <PageHeader className={styles.header}>
        <PageHeaderTitle>{t("competition.teams.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("competition.teams.description")}</PageHeaderDescription>
      </PageHeader>

      {props.error || props.capabilities.unavailable ? (
        <div {...applyStyles(styles.alerts)}>
          {props.error ? <SupportErrorAlert error={props.error} /> : null}
          {props.capabilities.unavailable ? (
            <Alert variant="warning">
              <span aria-hidden="true" {...applyStyles(styles.lock)}>
                <LockIcon className={lockIcon.className} style={lockIcon.style} />
              </span>
              <AlertTitle className={alertTitle.className} style={alertTitle.style}>
                {t("competition.teams.permissions.title")}
              </AlertTitle>
              <AlertDescription
                className={alertDescription.className}
                style={alertDescription.style}
              >
                {t("competition.teams.permissions.description")}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {showKpis ? (
        <CompetitionTeamsKpis
          loading={props.loadingList}
          partial={props.hasMoreTeams}
          summary={summary}
        />
      ) : null}

      <div data-selected={showDetailMobile ? "true" : undefined} {...applyStyles(styles.split)}>
        <Card className={showDetailMobile ? styles.panelHiddenOnMobile : styles.panelVisible}>
          <TeamList
            {...props}
            filter={filter}
            onFilterChange={setFilter}
            onQueryChange={setQuery}
            query={query}
            summary={summary}
          />
        </Card>
        <Card
          className={[
            styles.detailPanel,
            showDetailMobile ? styles.detailPanelVisible : styles.detailPanelHiddenOnMobile,
          ]}
        >
          <TeamDetail {...props} />
        </Card>
      </div>
    </main>
  );
}

export { EntryBadge, entryStatusLabel } from "./competition-teams-view-entry.tsx";
export { TeamDetail } from "./competition-teams-view-detail.tsx";
export { TeamList } from "./competition-teams-view-list.tsx";
