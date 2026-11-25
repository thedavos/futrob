"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { CheckIcon, ClipboardTextIcon, ClockIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Skeleton, Text } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ActivityFeedList } from "@/modules/notifications/presentation/activity-feed-list.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { OverviewCard, OverviewEmpty, ViewAllChevron } from "./competition-overview-card.tsx";
import {
  OVERVIEW_PENDING_LIMIT,
  type OverviewSlice,
  type PendingActivityPage,
  pendingTasks,
  pendingTotal,
} from "./competition-overview-model.ts";

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  rowItem: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "color-mix(in oklab, var(--border) 60%, transparent)",
    ":last-child": {
      borderBottomWidth: 0,
    },
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
  rowChevron: {
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "0.125rem",
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
  okIsland: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: "2.25rem",
    height: "2.25rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--success) 16%, transparent)",
    color: colors.success,
  },
});

export function PendingSection({
  activities,
  awaitingCount,
  competitionId,
  entriesPending,
  now,
  organizationId,
}: {
  readonly activities: OverviewSlice<PendingActivityPage>;
  readonly awaitingCount: OverviewSlice<number>;
  readonly competitionId: string;
  readonly entriesPending: OverviewSlice<number>;
  readonly now: Date;
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const params = { orgId: organizationId, competitionId };
  // The total counts every task read; only the first few are rendered.
  const pendingEntries = entriesPending.status === "ready" ? entriesPending.data : null;
  const openTasks =
    activities.status === "ready"
      ? pendingTasks(activities.data.activities, pendingEntries !== null)
      : [];
  const shownTasks = openTasks.slice(0, OVERVIEW_PENDING_LIMIT);
  const awaiting = awaitingCount.status === "ready" ? awaitingCount.data : null;
  const sources = [activities, entriesPending, awaitingCount];
  const failedSources = sources.filter((source) => source.status === "error");
  const hasSummaryRows = (pendingEntries ?? 0) > 0 || (awaiting ?? 0) > 0;
  const allKnown = sources.every((source) => source.status === "ready");
  const nothingPending = allKnown && !hasSummaryRows && openTasks.length === 0;
  const showSkeleton = sources.some((source) => source.status === "loading");
  const total =
    activities.status === "ready"
      ? pendingTotal(pendingEntries, awaiting ?? 0, activities.data)
      : { count: (pendingEntries ?? 0) + (awaiting ?? 0), partial: false };

  return (
    <OverviewCard
      action={
        total.count > 0 ? (
          <Badge variant="warning">
            {t(
              total.partial
                ? "competition.overview.pending.countAtLeast"
                : "competition.overview.pending.count",
              { count: total.count },
            )}
          </Badge>
        ) : null
      }
      title={t("competition.overview.pending.title")}
      titleId={titleId}
    >
      {hasSummaryRows ? (
        <ul aria-label={t("competition.overview.pending.title")} {...applyStyles(styles.list)}>
          {(pendingEntries ?? 0) > 0 ? (
            <li {...applyStyles(styles.rowItem)}>
              <Link
                params={params}
                to="/orgs/$orgId/competitions/$competitionId/teams"
                {...applyStyles(styles.row)}
              >
                <ClipboardTextIcon aria-hidden {...applyStyles(styles.rowIcon)} />
                <Text className={styles.copy} weight="semibold">
                  {t("competition.overview.pending.applications", { count: pendingEntries ?? 0 })}
                </Text>
                <span aria-hidden="true" {...applyStyles(styles.rowChevron)}>
                  <ViewAllChevron />
                </span>
              </Link>
            </li>
          ) : null}
          {(awaiting ?? 0) > 0 ? (
            <li {...applyStyles(styles.rowItem)}>
              <Link
                params={params}
                to="/orgs/$orgId/competitions/$competitionId/encounters"
                {...applyStyles(styles.row)}
              >
                <ClockIcon aria-hidden {...applyStyles(styles.rowIcon)} />
                <Text className={styles.copy} weight="semibold">
                  {t("competition.overview.pending.awaiting", { count: awaiting ?? 0 })}
                </Text>
                <span aria-hidden="true" {...applyStyles(styles.rowChevron)}>
                  <ViewAllChevron />
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
      {shownTasks.length > 0 ? (
        <ActivityFeedList
          activities={shownTasks}
          label={t("competition.overview.pending.activities")}
          now={now}
        />
      ) : null}
      {failedSources.length > 0 ? (
        <RetryAlert
          message={t("competition.overview.pending.error")}
          retry={() => failedSources.forEach((source) => source.retry())}
          t={t}
          variant="warning"
        />
      ) : null}
      {showSkeleton ? (
        <div
          aria-busy="true"
          aria-label={t("shell.queue.loading")}
          role="status"
          {...applyStyles(styles.stack)}
        >
          {[0, 1].map((index) => (
            <Skeleton key={index} {...applyStyles(styles.skeleton)} />
          ))}
        </div>
      ) : null}
      {nothingPending ? (
        <OverviewEmpty
          description={t("competition.overview.pending.empty.description")}
          icon={
            <span aria-hidden="true" {...applyStyles(styles.okIsland)}>
              <CheckIcon size={18} weight="bold" />
            </span>
          }
          title={t("competition.overview.pending.empty.title")}
        />
      ) : null}
    </OverviewCard>
  );
}
