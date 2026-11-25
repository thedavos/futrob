"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { TeamDto } from "@futrob/api-contracts";
import { CheckCircleIcon, ClockCountdownIcon, XCircleIcon } from "@phosphor-icons/react";
import {
  applyStyles,
  Badge,
  Caption,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  typography,
} from "@futrob/ui";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  formatTeamCreatedAt,
  summarizeTeamStatus,
  teamInitials,
  type TeamParticipation,
  type TeamParticipationIndex,
} from "./organization-teams-model.ts";
import { tableStyles as styles } from "./organization-teams.styles.ts";

const MAX_VISIBLE_CHIPS = 2;

const DESTINATION_PARTICIPANTS = {
  readParticipants: COMPETITION_PERMISSION.participantsRead,
} as const;
const DESTINATION_ROSTER = { readRoster: TEAM_PERMISSION.rosterRead } as const;

export type TeamsTableParticipation = {
  readonly index: TeamParticipationIndex;
  readonly loading: boolean;
};

export function OrganizationTeamsTable({
  labelledBy,
  organizationId,
  participation,
  teams,
}: {
  readonly labelledBy: string;
  readonly organizationId: string;
  readonly participation: TeamsTableParticipation;
  readonly teams: readonly TeamDto[];
}) {
  const { locale, t } = useI18n();
  const [expandedTeams, setExpandedTeams] = useState<ReadonlySet<string>>(() => new Set());
  const headCell = applyStyles(styles.head);
  const bodyCell = applyStyles(styles.cell);

  function toggleExpanded(teamId: string) {
    setExpandedTeams((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  return (
    <Table
      aria-labelledby={labelledBy}
      containerLabelledBy={labelledBy}
      dense
      {...applyStyles(styles.table)}
    >
      <TableHeader>
        <TableRow>
          <TableHead className={headCell.className} scope="col" style={headCell.style}>
            {t("org.teams.table.team")}
          </TableHead>
          <TableHead className={headCell.className} scope="col" style={headCell.style}>
            {t("org.teams.table.competitions")}
          </TableHead>
          <TableHead className={headCell.className} scope="col" style={headCell.style}>
            {t("org.teams.table.status")}
          </TableHead>
          <TableHead align="end" className={headCell.className} scope="col" style={headCell.style}>
            {t("org.teams.table.created")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team) => {
          const entries = participation.index.byTeam.get(team.id) ?? [];
          const expanded = expandedTeams.has(team.id);
          return (
            <TableRow key={team.id}>
              <TableCell className={bodyCell.className} style={bodyCell.style}>
                <div {...applyStyles(styles.identity)}>
                  <span aria-hidden="true" {...applyStyles(styles.monogram)}>
                    {teamInitials(team.name)}
                  </span>
                  <span {...applyStyles(styles.name)}>{team.name}</span>
                </div>
              </TableCell>
              <TableCell className={bodyCell.className} style={bodyCell.style}>
                <TeamCompetitions
                  entries={entries}
                  expanded={expanded}
                  loading={participation.loading}
                  onToggleExpanded={() => toggleExpanded(team.id)}
                  organizationId={organizationId}
                  team={team}
                />
              </TableCell>
              <TableCell className={bodyCell.className} style={bodyCell.style}>
                <TeamStatusCell
                  complete={participation.index.complete}
                  entries={entries}
                  loading={participation.loading}
                />
              </TableCell>
              <TableCell align="end" className={bodyCell.className} style={bodyCell.style}>
                <Caption {...applyStyles(typography.caption, styles.created)}>
                  {formatTeamCreatedAt(team.createdAt, locale)}
                </Caption>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function TeamCompetitions({
  entries,
  expanded,
  loading,
  onToggleExpanded,
  organizationId,
  team,
}: {
  readonly entries: readonly TeamParticipation[];
  readonly expanded: boolean;
  readonly loading: boolean;
  readonly onToggleExpanded: () => void;
  readonly organizationId: string;
  readonly team: TeamDto;
}) {
  const { t } = useI18n();
  if (entries.length > 0) {
    const visible = expanded ? entries : entries.slice(0, MAX_VISIBLE_CHIPS);
    const hiddenCount = entries.length - visible.length;
    return (
      <ul {...applyStyles(styles.chipList)}>
        {visible.map((entry) => (
          <li key={entry.competitionId} {...applyStyles(styles.chipItem)}>
            <CompetitionChip
              entry={entry}
              organizationId={organizationId}
              teamId={team.id}
              teamName={team.name}
            />
          </li>
        ))}
        {hiddenCount > 0 ? (
          <li {...applyStyles(styles.chipItem)}>
            <button
              aria-expanded={false}
              onClick={onToggleExpanded}
              type="button"
              {...applyStyles(styles.moreButton)}
            >
              {t("org.teams.more", { count: hiddenCount })}
            </button>
          </li>
        ) : expanded && entries.length > MAX_VISIBLE_CHIPS ? (
          <li {...applyStyles(styles.chipItem)}>
            <button
              aria-expanded={true}
              onClick={onToggleExpanded}
              type="button"
              {...applyStyles(styles.moreButton)}
            >
              {t("org.teams.less")}
            </button>
          </li>
        ) : null}
      </ul>
    );
  }
  if (loading) {
    return <Skeleton aria-hidden="true" {...applyStyles(styles.skeletonChips)} />;
  }
  return (
    <Caption aria-hidden="true" {...applyStyles(styles.muted)}>
      —
    </Caption>
  );
}

function TeamStatusCell({
  complete,
  entries,
  loading,
}: {
  readonly complete: boolean;
  readonly entries: readonly TeamParticipation[];
  readonly loading: boolean;
}) {
  const { t } = useI18n();
  if (loading && entries.length === 0) {
    return <Skeleton aria-hidden="true" {...applyStyles(styles.skeletonBadge)} />;
  }
  const summary = summarizeTeamStatus(entries, complete);
  switch (summary.kind) {
    case "pending":
      return (
        <Badge variant="warning">
          <ClockCountdownIcon aria-hidden="true" {...applyStyles(styles.badgeIcon)} />
          {t("org.teams.status.pending", { count: summary.count })}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="approved">
          <CheckCircleIcon aria-hidden="true" {...applyStyles(styles.badgeIcon)} />
          {t("org.teams.status.approved", { count: summary.count })}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircleIcon aria-hidden="true" {...applyStyles(styles.badgeIcon)} />
          {t("org.teams.status.rejected", { count: summary.count })}
        </Badge>
      );
    case "none":
      return <Badge variant="neutral">{t("org.teams.noCompetitions")}</Badge>;
    case "unavailable":
      return <Badge variant="neutral">{t("org.teams.competitionsUnavailable")}</Badge>;
  }
}

function CompetitionChip({
  entry,
  organizationId,
  teamId,
  teamName,
}: {
  readonly entry: TeamParticipation;
  readonly organizationId: string;
  readonly teamId: string;
  readonly teamName: string;
}) {
  const { t } = useI18n();
  // The destination lists participants (competition scope) and reads one roster (team scope);
  // each is resolved in its own scope because a narrower grant or deny overrides the organization's.
  const participants = useCapabilities(
    { organizationId, competitionId: entry.competitionId },
    DESTINATION_PARTICIPANTS,
  );
  const roster = useCapabilities(
    { organizationId, competitionId: entry.competitionId, teamId },
    DESTINATION_ROSTER,
  );
  const linked =
    !participants.loading &&
    !participants.unavailable &&
    !roster.loading &&
    !roster.unavailable &&
    participants.readParticipants &&
    roster.readRoster;
  const statusLabel = t(`org.teams.entry.${entry.status}`);
  const statusIcon =
    entry.status === "approved" ? (
      <CheckCircleIcon
        aria-hidden="true"
        {...applyStyles(styles.chipIcon, styles.chipIconApproved)}
      />
    ) : entry.status === "pending" ? (
      <ClockCountdownIcon
        aria-hidden="true"
        {...applyStyles(styles.chipIcon, styles.chipIconPending)}
      />
    ) : (
      <XCircleIcon aria-hidden="true" {...applyStyles(styles.chipIcon, styles.chipIconRejected)} />
    );

  const chipMain = (
    <span {...applyStyles(styles.chipMain)}>
      {statusIcon}
      <span {...applyStyles(styles.chipName)}>{entry.competitionName}</span>
    </span>
  );
  const statusText = (
    <span {...applyStyles(styles.chipStatus)}>
      <span aria-hidden="true">·</span>
      <span>{statusLabel}</span>
    </span>
  );

  if (!linked) {
    return (
      <span {...applyStyles(styles.chipBase)}>
        {chipMain}
        {statusText}
      </span>
    );
  }
  return (
    <Link
      aria-label={t("org.teams.link", {
        competition: entry.competitionName,
        status: statusLabel,
        team: teamName,
      })}
      params={{ orgId: organizationId, competitionId: entry.competitionId }}
      search={{ teamId }}
      to="/orgs/$orgId/competitions/$competitionId/teams"
      {...applyStyles(styles.chipBase, styles.chipLink)}
    >
      {chipMain}
      {statusText}
    </Link>
  );
}
