"use client";

import { Link } from "@tanstack/react-router";
import type { TeamDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Caption,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextLink,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  formatTeamCreatedAt,
  type TeamParticipation,
  type TeamParticipationIndex,
} from "./organization-teams-model.ts";

const styles = stylex.create({
  tableContainer: { borderWidth: 0, borderRadius: 0 },
  table: { minWidth: "24rem" },
  team: { display: "flex", flexDirection: "column", gap: "0.125rem", minWidth: 0 },
  name: { fontWeight: 600, overflowWrap: "anywhere" },
  muted: { color: colors.mutedForeground },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  item: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "0.5rem",
    minHeight: "2.75rem",
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "2.75rem",
    overflowWrap: "anywhere",
  },
  plainName: { overflowWrap: "anywhere" },
  skeleton: { height: "1rem", width: "8rem", maxWidth: "100%" },
});

export type TeamsTableParticipation = {
  readonly index: TeamParticipationIndex;
  readonly loading: boolean;
  /** Entries open the competition's team management only for actors allowed to read them. */
  readonly linksAllowed: boolean;
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
  return (
    <Table
      aria-labelledby={labelledBy}
      containerClassName={styles.tableContainer}
      containerLabelledBy={labelledBy}
      dense
      {...applyStyles(styles.table)}
    >
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("org.teams.table.team")}</TableHead>
          <TableHead scope="col">{t("org.teams.table.competitions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team) => (
          <TableRow key={team.id}>
            <TableCell>
              <div {...applyStyles(styles.team)}>
                <span {...applyStyles(styles.name)}>{team.name}</span>
                <Caption {...applyStyles(styles.muted)}>
                  {t("org.teams.created", { date: formatTeamCreatedAt(team.createdAt, locale) })}
                </Caption>
              </div>
            </TableCell>
            <TableCell>
              <TeamCompetitions
                organizationId={organizationId}
                participation={participation}
                team={team}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TeamCompetitions({
  organizationId,
  participation,
  team,
}: {
  readonly organizationId: string;
  readonly participation: TeamsTableParticipation;
  readonly team: TeamDto;
}) {
  const { t } = useI18n();
  const entries = participation.index.byTeam.get(team.id) ?? [];
  if (entries.length > 0) {
    return (
      <ul {...applyStyles(styles.list)}>
        {entries.map((entry) => (
          <li key={entry.competitionId} {...applyStyles(styles.item)}>
            <CompetitionEntry
              entry={entry}
              linked={participation.linksAllowed}
              organizationId={organizationId}
              teamId={team.id}
              teamName={team.name}
            />
            <Caption {...applyStyles(styles.muted)}>{t(`org.teams.entry.${entry.status}`)}</Caption>
          </li>
        ))}
      </ul>
    );
  }
  if (participation.loading) {
    return <Skeleton aria-hidden="true" {...applyStyles(styles.skeleton)} />;
  }
  return (
    <Caption {...applyStyles(styles.muted)}>
      {participation.index.complete
        ? t("org.teams.noCompetitions")
        : t("org.teams.competitionsUnavailable")}
    </Caption>
  );
}

function CompetitionEntry({
  entry,
  linked,
  organizationId,
  teamId,
  teamName,
}: {
  readonly entry: TeamParticipation;
  readonly linked: boolean;
  readonly organizationId: string;
  readonly teamId: string;
  readonly teamName: string;
}) {
  const { t } = useI18n();
  if (!linked) {
    return <span {...applyStyles(styles.plainName)}>{entry.competitionName}</span>;
  }
  return (
    <TextLink
      aria-label={t("org.teams.link", { competition: entry.competitionName, team: teamName })}
      render={
        <Link
          params={{ orgId: organizationId, competitionId: entry.competitionId }}
          search={{ teamId }}
          to="/orgs/$orgId/competitions/$competitionId/teams"
        />
      }
      {...applyStyles(styles.link)}
    >
      {entry.competitionName}
    </TextLink>
  );
}
