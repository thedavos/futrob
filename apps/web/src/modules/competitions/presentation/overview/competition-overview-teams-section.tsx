"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import type { CompetitionTeamManagementSummaryDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Button,
  Score,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  TextLink,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { OverviewCard, OverviewEmpty, ViewAllChevron } from "./competition-overview-card.tsx";
import { overviewTeams, type OverviewSlice } from "./competition-overview-model.ts";
import {
  OverviewTeamsBodySkeleton,
  OverviewViewAllSkeleton,
} from "./competition-overview-skeleton.tsx";

const styles = stylex.create({
  action: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    gap: "0.25rem",
    textDecorationLine: "none",
    fontWeight: "var(--font-weight-medium)",
  },
  tableCell: {
    height: "auto",
    paddingBlock: "0.75rem",
  },
  teamLink: {
    display: "block",
    maxWidth: "100%",
    overflow: "hidden",
    color: colors.foreground,
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
    outlineStyle: "none",
    borderRadius: "var(--corner-xs)",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  eaClub: {
    color: colors.mutedForeground,
  },
});

export function TeamsSection({
  competitionId,
  organizationId,
  teams,
}: {
  readonly competitionId: string;
  readonly organizationId: string;
  readonly teams: OverviewSlice<readonly CompetitionTeamManagementSummaryDto[]>;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const params = { orgId: organizationId, competitionId };
  const listed = teams.status === "ready" ? overviewTeams(teams.data) : [];
  const bodyCell = applyStyles(styles.tableCell);

  return (
    <OverviewCard
      action={
        teams.status === "loading" ? (
          <OverviewViewAllSkeleton />
        ) : listed.length > 0 ? (
          <TextLink
            className={styles.action}
            render={<Link params={params} to="/orgs/$orgId/competitions/$competitionId/teams" />}
            text="caption"
          >
            {t("competition.overview.teams.viewAll")}
            <ViewAllChevron />
          </TextLink>
        ) : null
      }
      flush={listed.length > 0 || teams.status === "loading"}
      title={t("competition.overview.teams.title")}
      titleId={titleId}
    >
      {teams.status === "loading" ? (
        <div aria-busy="true" aria-label={t("competition.overview.loading")} role="status">
          <OverviewTeamsBodySkeleton />
        </div>
      ) : null}
      {teams.status === "error" ? (
        <RetryAlert message={t("competition.overview.teams.error")} retry={teams.retry} t={t} />
      ) : null}
      {teams.status === "ready" && listed.length === 0 ? (
        <OverviewEmpty
          action={
            <Button
              render={<Link params={params} to="/orgs/$orgId/competitions/$competitionId/teams" />}
              variant="outline"
            >
              {t("competition.overview.teams.empty.action")}
            </Button>
          }
          description={t("competition.overview.teams.empty.description")}
          title={t("competition.overview.teams.empty.title")}
        />
      ) : null}
      {listed.length > 0 ? (
        <Table containerLabelledBy={titleId} dense>
          <TableHeader>
            <TableRow>
              <TableHead>{t("competition.overview.teams.column.team")}</TableHead>
              <TableHead>{t("competition.overview.teams.column.eaClub")}</TableHead>
              <TableHead align="end">{t("competition.overview.teams.column.roster")}</TableHead>
              <TableHead align="end">{t("competition.overview.teams.column.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listed.map((item) => (
              <TableRow key={item.team.id}>
                <TableCell className={bodyCell.className} style={bodyCell.style}>
                  <Link
                    params={params}
                    search={{ teamId: item.team.id }}
                    to="/orgs/$orgId/competitions/$competitionId/teams"
                    {...applyStyles(styles.teamLink)}
                  >
                    {item.team.name}
                  </Link>
                </TableCell>
                <TableCell className={bodyCell.className} style={bodyCell.style}>
                  {item.externalClub ? (
                    <Text className={styles.eaClub} look="caption">
                      {item.externalClub.externalClubName}
                    </Text>
                  ) : (
                    <Badge variant="warning">{t("competition.overview.teams.ea.unlinked")}</Badge>
                  )}
                </TableCell>
                <TableCell align="end" className={bodyCell.className} style={bodyCell.style}>
                  <Score
                    aria-label={t("competition.overview.teams.roster", {
                      count: item.roster.memberCount,
                      max: item.roster.maxSize,
                    })}
                    as="span"
                    size="table"
                  >
                    {`${item.roster.memberCount}/${item.roster.maxSize}`}
                  </Score>
                </TableCell>
                <TableCell align="end" className={bodyCell.className} style={bodyCell.style}>
                  <Badge variant={item.entry.status === "approved" ? "approved" : "warning"}>
                    {item.entry.status === "approved"
                      ? t("competition.overview.teams.entry.approved")
                      : t("competition.overview.teams.entry.pending")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </OverviewCard>
  );
}
