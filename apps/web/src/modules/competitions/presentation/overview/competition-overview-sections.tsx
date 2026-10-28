"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardTextIcon, ClockIcon } from "@phosphor-icons/react";
import type {
  ActivityEntryDto,
  CompetitionEncounterDto,
  CompetitionTeamManagementSummaryDto,
  ListCompetitionEncountersResponse,
} from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Button, Caption, Skeleton, Text, TextLink } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ActivityFeedList } from "@/modules/notifications/presentation/activity-feed-list.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { OverviewCard, OverviewEmpty, ViewAllChevron } from "./competition-overview-card.tsx";
import {
  OVERVIEW_PENDING_LIMIT,
  overviewTeams,
  upcomingEncounters,
  type OverviewSlice,
} from "./competition-overview-model.ts";

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  row: {
    display: "flex",
    minHeight: "2.75rem",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingBlock: "0.5rem",
    color: colors.foreground,
    textDecorationLine: "none",
    borderRadius: "var(--corner-md)",
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  rowIcon: {
    display: "flex",
    flexShrink: 0,
    width: "1rem",
    height: "1rem",
    color: colors.mutedForeground,
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "0.125rem",
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meta: {
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    gap: "0.25rem",
    textDecorationLine: "none",
    fontWeight: "var(--font-weight-medium)",
  },
  stack: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.5rem",
  },
  skeleton: {
    height: "2.75rem",
    width: "100%",
  },
});

function SectionSkeleton({ label, rows = 3 }: { readonly label: string; readonly rows?: number }) {
  return (
    <div aria-busy="true" aria-label={label} role="status" {...applyStyles(styles.stack)}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} {...applyStyles(styles.skeleton)} />
      ))}
    </div>
  );
}

export function PendingSection({
  activities,
  awaitingCount,
  competitionId,
  entriesPending,
  now,
  organizationId,
}: {
  readonly activities: OverviewSlice<readonly ActivityEntryDto[]>;
  /** `null` while encounters are loading or failed: the row is then left out, not shown as zero. */
  readonly awaitingCount: number | null;
  readonly competitionId: string;
  /** `null` while entries are loading or failed. */
  readonly entriesPending: number | null;
  readonly now: Date;
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const params = { orgId: organizationId, competitionId };
  const openTasks =
    activities.status === "ready"
      ? activities.data
          .filter((entry) => entry.status === "open" && entry.requiresAction)
          .slice(0, OVERVIEW_PENDING_LIMIT)
      : [];
  const hasSummaryRows = (entriesPending ?? 0) > 0 || (awaitingCount ?? 0) > 0;
  const countsUnknown = entriesPending === null || awaitingCount === null;
  const allKnown = activities.status === "ready" && !countsUnknown;
  const nothingPending = allKnown && !hasSummaryRows && openTasks.length === 0;
  const showSkeleton =
    activities.status === "loading" || (countsUnknown && openTasks.length === 0 && !hasSummaryRows);

  return (
    <OverviewCard title={t("competition.overview.pending.title")} titleId={titleId}>
      {hasSummaryRows ? (
        <ul aria-label={t("competition.overview.pending.title")} {...applyStyles(styles.list)}>
          {(entriesPending ?? 0) > 0 ? (
            <li>
              <Link
                params={params}
                to="/orgs/$orgId/competitions/$competitionId/teams"
                {...applyStyles(styles.row)}
              >
                <ClipboardTextIcon aria-hidden {...applyStyles(styles.rowIcon)} />
                <Text className={styles.copy} weight="semibold">
                  {t("competition.overview.pending.applications", { count: entriesPending ?? 0 })}
                </Text>
              </Link>
            </li>
          ) : null}
          {(awaitingCount ?? 0) > 0 ? (
            <li>
              <Link
                params={params}
                to="/orgs/$orgId/competitions/$competitionId/encounters"
                {...applyStyles(styles.row)}
              >
                <ClockIcon aria-hidden {...applyStyles(styles.rowIcon)} />
                <Text className={styles.copy} weight="semibold">
                  {t("competition.overview.pending.awaiting", { count: awaitingCount ?? 0 })}
                </Text>
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
      {openTasks.length > 0 ? (
        <ActivityFeedList
          activities={openTasks}
          label={t("competition.overview.pending.activities")}
          now={now}
        />
      ) : null}
      {activities.status === "error" ? (
        <RetryAlert
          message={t("competition.overview.pending.error")}
          retry={activities.retry}
          t={t}
          variant="warning"
        />
      ) : null}
      {showSkeleton ? <SectionSkeleton label={t("shell.queue.loading")} rows={2} /> : null}
      {nothingPending ? (
        <OverviewEmpty
          description={t("competition.overview.pending.empty.description")}
          title={t("competition.overview.pending.empty.title")}
        />
      ) : null}
    </OverviewCard>
  );
}

export function UpcomingSection({
  competitionId,
  encounters,
  organizationId,
}: {
  readonly competitionId: string;
  readonly encounters: OverviewSlice<ListCompetitionEncountersResponse>;
  readonly organizationId: string;
}) {
  const { locale, t } = useI18n();
  const titleId = useId();
  const upcoming =
    encounters.status === "ready" ? upcomingEncounters(encounters.data.encounters) : [];

  return (
    <OverviewCard
      action={
        encounters.status === "ready" && encounters.data.encounters.length > 0 ? (
          <TextLink
            className={styles.action}
            render={
              <Link
                params={{ orgId: organizationId, competitionId }}
                to="/orgs/$orgId/competitions/$competitionId/encounters"
              />
            }
            text="caption"
          >
            {t("competition.overview.upcoming.viewAll")}
            <ViewAllChevron />
          </TextLink>
        ) : null
      }
      title={t("competition.overview.upcoming.title")}
      titleId={titleId}
    >
      {encounters.status === "loading" ? (
        <SectionSkeleton label={t("encounters.list.loading")} />
      ) : null}
      {encounters.status === "error" ? (
        <RetryAlert
          message={t("competition.overview.upcoming.error")}
          retry={encounters.retry}
          t={t}
        />
      ) : null}
      {encounters.status === "ready" && upcoming.length === 0 ? (
        <OverviewEmpty
          description={t("competition.overview.upcoming.empty.description")}
          title={t("competition.overview.upcoming.empty.title")}
        />
      ) : null}
      {encounters.status === "ready" && upcoming.length > 0 ? (
        <>
          <ol aria-labelledby={titleId} {...applyStyles(styles.list)}>
            {upcoming.map((encounter) => (
              <li key={encounter.encounterId}>
                <UpcomingRow
                  competitionId={competitionId}
                  encounter={encounter}
                  locale={locale}
                  organizationId={organizationId}
                  timeZone={encounters.data.competition.timeZone}
                />
              </li>
            ))}
          </ol>
          <Caption as="p">
            {t("encounters.list.timeZone", { zone: encounters.data.competition.timeZone })}
          </Caption>
        </>
      ) : null}
    </OverviewCard>
  );
}

function UpcomingRow({
  competitionId,
  encounter,
  locale,
  organizationId,
  timeZone,
}: {
  readonly competitionId: string;
  readonly encounter: CompetitionEncounterDto;
  readonly locale: string;
  readonly organizationId: string;
  readonly timeZone: string;
}) {
  const { t } = useI18n();
  const kickoff = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const round = encounter.round.total
    ? t("encounter.roundOf", { number: encounter.round.number, total: encounter.round.total })
    : t("encounter.round", { number: encounter.round.number });
  return (
    <Link
      aria-label={t("encounters.list.open", {
        home: encounter.home.name,
        away: encounter.away.name,
      })}
      params={{ orgId: organizationId, competitionId, encounterId: encounter.encounterId }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <span {...applyStyles(styles.copy)}>
        <Text className={styles.truncate} tone="default" weight="semibold">
          {`${encounter.home.name} ${t("encounter.vs")} ${encounter.away.name}`}
        </Text>
        <Caption as="span">{round}</Caption>
      </span>
      <Caption as="span" className={styles.meta}>
        <time dateTime={encounter.scheduledStartAt}>
          {kickoff.format(new Date(encounter.scheduledStartAt))}
        </time>
      </Caption>
    </Link>
  );
}

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

  return (
    <OverviewCard
      action={
        listed.length > 0 ? (
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
      title={t("competition.overview.teams.title")}
      titleId={titleId}
    >
      {teams.status === "loading" ? (
        <SectionSkeleton label={t("competition.overview.loading")} />
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
        <ul aria-labelledby={titleId} {...applyStyles(styles.list)}>
          {listed.map((item) => (
            <li key={item.team.id}>
              <Link
                params={params}
                search={{ teamId: item.team.id }}
                to="/orgs/$orgId/competitions/$competitionId/teams"
                {...applyStyles(styles.row)}
              >
                <span {...applyStyles(styles.copy)}>
                  <Text className={styles.truncate} tone="default" weight="semibold">
                    {item.team.name}
                  </Text>
                  <Caption as="span">
                    {t("competition.overview.teams.roster", {
                      count: item.roster.memberCount,
                      max: item.roster.maxSize,
                    })}
                  </Caption>
                </span>
                <Badge variant={item.entry.status === "approved" ? "approved" : "warning"}>
                  {item.entry.status === "approved"
                    ? t("competition.overview.teams.entry.approved")
                    : t("competition.overview.teams.entry.pending")}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </OverviewCard>
  );
}
