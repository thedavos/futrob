"use client";

import { Link } from "@tanstack/react-router";
import type { CompetitionDto, TeamDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Card, CardContent, CardHeader, Heading } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { OrganizationHomeCompetitionsTable } from "./organization-home-competitions-table.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  formatOrganizationRelativeTime,
  organizationCompetitionHref,
  organizationCompetitionStatusLabel,
} from "./organization-home-copy.ts";
import {
  recentOrganizationActivity,
  recentOrganizationCompetitions,
} from "./organization-home-model.ts";

const styles = stylex.create({
  stack: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
  card: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1.25rem",
  },
  title: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingTop: 0,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  row: {
    display: "flex",
    minHeight: "2.75rem",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
    color: colors.foreground,
    textDecorationLine: "none",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "0.125rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
});

export function OrganizationHomeSections({
  competitions,
  organizationId,
  teams,
}: {
  readonly competitions: readonly CompetitionDto[];
  readonly organizationId: string;
  readonly teams: readonly TeamDto[];
}) {
  const { locale, t } = useI18n();
  const listed = recentOrganizationCompetitions(competitions);
  const activity = recentOrganizationActivity(competitions, teams);
  const now = new Date();

  return (
    <div {...applyStyles(styles.stack)}>
      <OrganizationHomeCompetitionsTable competitions={listed} organizationId={organizationId} />

      <Card className={styles.card}>
        <CardHeader className={styles.header}>
          <Heading className={styles.title}>{t("org.home.activity")}</Heading>
        </CardHeader>
        <CardContent className={styles.content}>
          {activity.length === 0 ? (
            <Caption>{t("org.home.activity.empty")}</Caption>
          ) : (
            activity.map((item) => {
              const time = formatOrganizationRelativeTime(new Date(item.at), locale, now);
              if (item.kind === "team") {
                return (
                  <Link
                    key={`team-${item.id}`}
                    params={{ orgId: organizationId }}
                    to="/orgs/$orgId/teams"
                    {...applyStyles(styles.row)}
                  >
                    <span {...applyStyles(styles.copy)}>
                      <span {...applyStyles(styles.name)}>{item.name}</span>
                      <Caption>{t("org.home.activity.team", { time })}</Caption>
                    </span>
                  </Link>
                );
              }
              const destination = organizationCompetitionHref(organizationId, item.id, item.status);
              return (
                <Link
                  key={`competition-${item.id}`}
                  params={destination.params}
                  to={destination.to}
                  {...applyStyles(styles.row)}
                >
                  <span {...applyStyles(styles.copy)}>
                    <span {...applyStyles(styles.name)}>{item.name}</span>
                    <Caption>
                      {t("org.home.activity.competition", {
                        status: organizationCompetitionStatusLabel(item.status, t),
                        time,
                      })}
                    </Caption>
                  </span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
