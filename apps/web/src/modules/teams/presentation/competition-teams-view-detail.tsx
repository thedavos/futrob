"use client";

import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  SectionTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  typography,
} from "@futrob/ui";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  LinkIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  UsersThreeIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import {
  eaPlatformLabel,
  formatProviderGameEdition,
} from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  ConfirmAction,
  ExternalClubDialog,
  InvitationDialog,
  RosterRoleEditor,
} from "./competition-team-actions.tsx";
import type { CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { EntryBadge } from "./competition-teams-view-entry.tsx";
import { styles } from "./competition-teams-view-detail.styles.ts";
import { TeamDetailStats } from "./competition-teams-view-stats.tsx";
import { platformLabel } from "./platform-label.ts";
import { RosterPlayerCell } from "./roster-player-cell.tsx";
import { useRoleLabels } from "./roster-role-labels.ts";

const skeletonTitle = applyStyles(styles.skeletonTitle);
const skeletonStats = applyStyles(styles.skeletonStats);
const skeletonTable = applyStyles(styles.skeletonTable);
const back = applyStyles(styles.back);

export function TeamDetail(props: CompetitionTeamsViewProps) {
  const { t } = useI18n();
  const roleLabel = useRoleLabels();

  if (!props.selectedTeamId) {
    return (
      <div {...applyStyles(styles.emptyWrap)}>
        <EmptyState className={styles.empty}>
          <EmptyStateIcon>
            <UsersThreeIcon />
          </EmptyStateIcon>
          <EmptyStateTitle>{t("competition.teams.detail.emptyTitle")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("competition.teams.detail.emptyDescription")}
          </EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }

  if (props.loadingDetail || !props.detail) {
    return (
      <div
        aria-label={t("competition.teams.detail.loading")}
        role="status"
        {...applyStyles(styles.loading)}
      >
        <Skeleton className={skeletonTitle.className} style={skeletonTitle.style} />
        <Skeleton className={skeletonStats.className} style={skeletonStats.style} />
        <Skeleton className={skeletonTable.className} style={skeletonTable.style} />
      </div>
    );
  }

  const { detail, capabilities } = props;
  const isPending = detail.entry.status === "pending";
  const showDecision = capabilities.manageEntries && isPending;
  const missingClub = detail.externalClub === null;
  const rosterOpen = detail.roster.state === "open";
  const isRejected = detail.entry.status === "rejected";

  // One primary Lima action per context (design.md):
  // 1) Approve when pending decision is active
  // 2) Associate EA club when approved and club is missing
  // 3) Invite player otherwise (when active)
  const clubVariant =
    !showDecision && missingClub && !isRejected ? ("default" as const) : ("outline" as const);
  const inviteVariant =
    !showDecision && !missingClub && !isRejected ? ("default" as const) : ("outline" as const);

  return (
    <>
      {showDecision ? (
        <section
          aria-label={t("competition.teams.detail.decisionTitle")}
          {...applyStyles(styles.decisionStrip)}
        >
          <div {...applyStyles(styles.decisionLead)}>
            <ClockCountdownIcon aria-hidden="true" {...applyStyles(styles.decisionIcon)} />
            <div {...applyStyles(styles.decisionCopy)}>
              <h3 {...applyStyles(styles.decisionTitle)}>
                {t("competition.teams.detail.decisionTitle")}
              </h3>
              <p {...applyStyles(typography.caption, styles.muted)}>
                {t("competition.teams.detail.decisionDescription")}
              </p>
            </div>
          </div>
          <div {...applyStyles(styles.actions)}>
            <ConfirmAction
              confirmLabel={t("competition.teams.detail.rejectConfirmTitle")}
              confirmVariant="destructive"
              dense
              description={t("competition.teams.detail.rejectConfirmDescription")}
              disabled={props.busy}
              onConfirm={() => props.onDecideEntry("reject")}
              triggerLabel={t("competition.teams.detail.reject")}
              variant="outline"
            />
            <ConfirmAction
              confirmLabel={t("competition.teams.detail.approveConfirmTitle")}
              confirmVariant="default"
              dense
              description={t("competition.teams.detail.approveConfirmDescription")}
              disabled={props.busy}
              onConfirm={() => props.onDecideEntry("approve")}
              triggerIcon={
                <CheckCircleIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                  {...applyStyles(styles.btnIcon)}
                />
              }
              triggerLabel={t("competition.teams.detail.approve")}
              variant="default"
            />
          </div>
        </section>
      ) : null}

      <div {...applyStyles(styles.body)}>
        <div {...applyStyles(styles.header)}>
          <div {...applyStyles(styles.identity)}>
            <Button
              className={back.className}
              dense
              onClick={() => props.onSelectTeam(null)}
              style={back.style}
              variant="ghost"
            >
              <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
              {t("competition.teams.detail.back")}
            </Button>
            <div {...applyStyles(styles.titleBlock)}>
              <div {...applyStyles(styles.titleRow)}>
                <h2 title={detail.team.name} {...applyStyles(typography.heading, styles.title)}>
                  {detail.team.name}
                </h2>
                <EntryBadge status={detail.entry.status} />
              </div>
              <p
                {...applyStyles(
                  typography.caption,
                  styles.clubRow,
                  missingClub && styles.clubRowMissing,
                )}
              >
                {detail.externalClub ? (
                  <>
                    <LinkIcon aria-hidden="true" {...applyStyles(styles.inlineIcon)} />
                    <span>
                      {detail.externalClub.externalClubName} ·{" "}
                      {eaPlatformLabel(detail.externalClub.platform)} ·{" "}
                      {formatProviderGameEdition(detail.externalClub.gameEdition)}
                    </span>
                  </>
                ) : (
                  <>
                    <WarningIcon aria-hidden="true" {...applyStyles(styles.inlineIcon)} />
                    <span>{t("competition.teams.detail.noClub")}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div {...applyStyles(styles.actions)}>
            {capabilities.manageExternalClub ? (
              <ExternalClubDialog
                dense
                onConnectClub={props.onConnectClub}
                onSearchClubs={props.onSearchClubs}
                variant={clubVariant}
              />
            ) : null}
            {capabilities.manageInvitations ? (
              <InvitationDialog
                allowedRoles={capabilities.manageRoles ? undefined : ["player"]}
                busy={props.busy}
                dense
                invitationUrl={props.invitationUrl}
                onCreateInvitation={props.onCreateInvitation}
                variant={inviteVariant}
              />
            ) : null}
          </div>
        </div>

        <TeamDetailStats detail={detail} />

        <section {...applyStyles(styles.roster)}>
          <div {...applyStyles(styles.rosterHeader)}>
            <SectionTitle as="h3">
              {t("competition.teams.detail.rosterHeading", { count: detail.members.length })}
            </SectionTitle>
            {capabilities.manageRoster ? (
              <ConfirmAction
                confirmLabel={
                  rosterOpen
                    ? t("competition.teams.detail.closeRoster")
                    : t("competition.teams.detail.openRoster")
                }
                confirmVariant="outline"
                dense
                description={
                  rosterOpen
                    ? t("competition.teams.detail.closeRosterDescription")
                    : t("competition.teams.detail.openRosterDescription")
                }
                disabled={props.busy}
                onConfirm={() => props.onSetRosterOpen(!rosterOpen)}
                triggerIcon={
                  rosterOpen ? (
                    <LockSimpleIcon
                      aria-hidden="true"
                      data-icon="inline-start"
                      {...applyStyles(styles.btnIcon)}
                    />
                  ) : (
                    <LockSimpleOpenIcon
                      aria-hidden="true"
                      data-icon="inline-start"
                      {...applyStyles(styles.btnIcon)}
                    />
                  )
                }
                triggerLabel={
                  rosterOpen
                    ? t("competition.teams.detail.closeRoster")
                    : t("competition.teams.detail.openRoster")
                }
                variant="ghost"
              />
            ) : null}
          </div>

          {detail.members.length === 0 ? (
            <EmptyState className={styles.emptyRoster}>
              <span aria-hidden="true" {...applyStyles(styles.emptyRosterIcon)}>
                <UsersThreeIcon aria-hidden="true" {...applyStyles(styles.emptyRosterGlyph)} />
              </span>
              <EmptyStateCopy>
                <EmptyStateTitle>{t("competition.teams.detail.emptyRosterTitle")}</EmptyStateTitle>
                <EmptyStateDescription>
                  {rosterOpen
                    ? t("competition.teams.detail.emptyRosterOpenDescription")
                    : t("competition.teams.detail.emptyRosterClosedDescription")}
                </EmptyStateDescription>
              </EmptyStateCopy>
              {capabilities.manageInvitations && rosterOpen && !isRejected ? (
                <EmptyStateActions>
                  <InvitationDialog
                    allowedRoles={capabilities.manageRoles ? undefined : ["player"]}
                    busy={props.busy}
                    dense
                    invitationUrl={props.invitationUrl}
                    onCreateInvitation={props.onCreateInvitation}
                    triggerLabel={t("competition.teams.detail.emptyRosterInvite")}
                    variant="outline"
                  />
                </EmptyStateActions>
              ) : null}
            </EmptyState>
          ) : (
            <Table dense>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("competition.teams.detail.column.player")}</TableHead>
                  <TableHead>{t("competition.teams.detail.column.account")}</TableHead>
                  <TableHead>{t("competition.teams.detail.column.role")}</TableHead>
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
                        {account ? (
                          `${platformLabel(account.platform)} · ${formatProviderGameEdition(account.gameEdition)}`
                        ) : (
                          <span {...applyStyles(styles.accountMuted)}>
                            {t("competition.teams.detail.accountMissing")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {capabilities.manageRoles ? (
                          <RosterRoleEditor
                            busy={props.busy}
                            displayName={member.presentation.displayName}
                            membershipId={member.membership.id}
                            onChangeRole={props.onChangeRole}
                            role={member.membership.role}
                          />
                        ) : (
                          <span {...applyStyles(styles.role)}>
                            {roleLabel[member.membership.role]}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
