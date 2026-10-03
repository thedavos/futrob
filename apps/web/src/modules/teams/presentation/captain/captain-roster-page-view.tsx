"use client";

import type {
  CompetitionTeamManagementDetailResponse,
  ExternalClubDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  SectionTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { PlusIcon } from "@phosphor-icons/react";
import { formatProviderGameEdition } from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import {
  ConfirmAction,
  ExternalClubDialog,
  RosterRoleEditor,
} from "../competition-team-actions.tsx";
import { platformLabel } from "../platform-label.ts";
import { RosterPlayerCell } from "../roster-player-cell.tsx";
import { useRoleLabels } from "../roster-role-labels.ts";
import { CaptainEntryClosedAlert } from "./captain-entry-closed-alert.tsx";
import type { CaptainLinks } from "./captain-links.tsx";
import { CaptainPageFrame } from "./captain-page-frame.tsx";
import { styles } from "./captain-page.styles.ts";
import { CaptainRosterStats } from "./captain-roster-stats.tsx";
import { isRosterWritable, type CaptainTeamAccess } from "./captain-team-access.ts";
import type { CaptainCapabilities } from "./use-captain-team.ts";

export type CaptainRosterPageViewProps = {
  readonly access: CaptainTeamAccess;
  readonly capabilities: CaptainCapabilities;
  readonly detail: CompetitionTeamManagementDetailResponse | null;
  readonly error: SupportError | null;
  readonly busy?: boolean;
  readonly links: CaptainLinks;
  readonly onRetry: () => void;
  readonly onRetryDetail: () => void;
  readonly onChangeRole: (membershipId: string, role: RosterMembershipRoleDto) => Promise<void>;
  readonly onSetRosterOpen: (open: boolean) => Promise<void>;
  readonly onSearchClubs: (query: string) => Promise<readonly ExternalClubDto[]>;
  readonly onConnectClub: (club: ExternalClubDto) => Promise<void>;
};

export function CaptainRosterPageView(props: CaptainRosterPageViewProps) {
  const { t } = useI18n();
  const { capabilities, detail } = props;
  const writable = detail ? isRosterWritable(detail.entry.status) : false;
  return (
    <CaptainPageFrame
      access={props.access}
      actions={
        writable ? (
          <>
            {capabilities.manageExternalClub ? (
              <ExternalClubDialog
                onConnectClub={props.onConnectClub}
                onSearchClubs={props.onSearchClubs}
              />
            ) : null}
            {capabilities.manageInvitations ? (
              <Button render={props.links.invitations} role="link">
                <PlusIcon aria-hidden="true" /> {t("captain.roster.invite")}
              </Button>
            ) : null}
          </>
        ) : null
      }
      detail={detail}
      error={props.error}
      forbiddenKey="captain.forbidden.roster"
      links={props.links}
      onRetry={props.onRetry}
      onRetryDetail={props.onRetryDetail}
      page="captain.roster"
    >
      {(loaded) => <RosterContent {...props} detail={loaded} writable={writable} />}
    </CaptainPageFrame>
  );
}

function RosterContent({
  detail,
  capabilities,
  busy,
  writable,
  onChangeRole,
  onSetRosterOpen,
}: CaptainRosterPageViewProps & {
  readonly detail: CompetitionTeamManagementDetailResponse;
  readonly writable: boolean;
}) {
  const { t } = useI18n();
  const roleLabel = useRoleLabels();
  const open = detail.roster.state === "open";
  return (
    <>
      {writable ? null : <CaptainEntryClosedAlert />}
      <CaptainRosterStats detail={detail} showClub />
      <section {...applyStyles(styles.section)}>
        <div {...applyStyles(styles.sectionHeader)}>
          <SectionTitle>{t("captain.roster.players")}</SectionTitle>
          {capabilities.manageRoster ? (
            <ConfirmAction
              confirmLabel={open ? t("captain.roster.close") : t("captain.roster.open")}
              description={
                open ? t("captain.roster.closeDescription") : t("captain.roster.openDescription")
              }
              disabled={busy || !writable}
              onConfirm={() => onSetRosterOpen(!open)}
              triggerLabel={open ? t("captain.roster.close") : t("captain.roster.open")}
            />
          ) : null}
        </div>
        <Table dense>
          <TableHeader>
            <TableRow>
              <TableHead>{t("captain.roster.column.player")}</TableHead>
              <TableHead>{t("captain.roster.column.role")}</TableHead>
              <TableHead>{t("captain.roster.column.platform")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.members.map((member) => {
              const account = member.presentation.gameAccount;
              return (
                <TableRow key={member.membership.id}>
                  <TableCell>
                    <RosterPlayerCell
                      avatarUrl={member.presentation.avatarUrl}
                      displayName={member.presentation.displayName}
                    />
                  </TableCell>
                  <TableCell>
                    {capabilities.manageRoles ? (
                      <RosterRoleEditor
                        busy={busy || !writable}
                        displayName={member.presentation.displayName}
                        membershipId={member.membership.id}
                        onChangeRole={onChangeRole}
                        role={member.membership.role}
                      />
                    ) : (
                      roleLabel[member.membership.role]
                    )}
                  </TableCell>
                  <TableCell>
                    {account ? (
                      `${platformLabel(account.platform)} · ${formatProviderGameEdition(account.gameEdition)}`
                    ) : (
                      <span {...applyStyles(styles.muted)}>
                        {t("captain.roster.platform.missing")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {detail.members.length <= 1 && capabilities.manageInvitations && writable ? (
          <EmptyState>
            <EmptyStateCopy>
              <EmptyStateTitle>{t("captain.roster.alone.title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("captain.roster.alone.description")}</EmptyStateDescription>
            </EmptyStateCopy>
          </EmptyState>
        ) : null}
      </section>
    </>
  );
}
