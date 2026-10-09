"use client";

import type { ActivityEntryDto } from "@futrob/api-contracts";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Heading,
  TextLink,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ActivityFeedList, ActivityFeedSkeleton } from "./activity-feed-list.tsx";
import { ActivityClientError } from "./activity-browser-client.ts";
import { useOrganizationRecentActivityQuery } from "./activity-queries.ts";
import { ORGANIZATION_RECENT_ACTIVITY_LIMIT } from "./activity-sources.ts";

const styles = stylex.create({
  card: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
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
  action: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    textDecorationLine: "none",
    fontWeight: "var(--font-weight-medium)",
  },
  chevron: {
    width: "1rem",
    height: "1rem",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingTop: 0,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  error: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
  },
});

export type OrganizationRecentActivityState =
  | { readonly status: "pending" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "success"; readonly activities: readonly ActivityEntryDto[] };

/**
 * «Actividad reciente» of the organization home: the latest activity of every kind, at most
 * ten rows, with a link to the full feed whenever there is something to show.
 */
export function OrganizationRecentActivityView({
  organizationId,
  state,
  now,
}: {
  readonly organizationId: string;
  readonly state: OrganizationRecentActivityState;
  readonly now?: Date;
}) {
  const { t } = useI18n();
  const hasRows = state.status === "success" && state.activities.length > 0;

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <Heading className={styles.title}>{t("activity.recent.title")}</Heading>
        {hasRows ? (
          <TextLink
            className={styles.action}
            render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId/activity" />}
            text="caption"
          >
            {t("activity.recent.viewAll")}
            <CaretRightIcon aria-hidden {...applyStyles(styles.chevron)} />
          </TextLink>
        ) : null}
      </CardHeader>
      <CardContent className={styles.content}>
        {state.status === "pending" ? <ActivityFeedSkeleton /> : null}
        {state.status === "error" ? (
          <div {...applyStyles(styles.error)} role="alert">
            <Caption>{t("activity.error")}</Caption>
            <Button dense onClick={state.retry} variant="outline">
              {t("common.retry")}
            </Button>
          </div>
        ) : null}
        {state.status === "success" && state.activities.length === 0 ? (
          <Caption>{t("activity.recent.empty")}</Caption>
        ) : null}
        {hasRows ? (
          <ActivityFeedList
            label={t("activity.recent.title")}
            activities={state.activities.slice(0, ORGANIZATION_RECENT_ACTIVITY_LIMIT)}
            now={now}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OrganizationRecentActivity({
  organizationId,
}: {
  readonly organizationId: string;
}) {
  const query = useOrganizationRecentActivityQuery(organizationId);
  // Members who do not operate the organization have no feed to read: show nothing.
  if (query.error instanceof ActivityClientError && query.error.status === 403) return null;
  const state: OrganizationRecentActivityState = query.isPending
    ? { status: "pending" }
    : query.isError
      ? { status: "error", retry: () => void query.refetch() }
      : { status: "success", activities: query.data.activities };
  return <OrganizationRecentActivityView organizationId={organizationId} state={state} />;
}
