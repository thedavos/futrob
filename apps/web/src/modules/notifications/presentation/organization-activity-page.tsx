"use client";

import type { ActivityEntryDto } from "@futrob/api-contracts";
import { LockSimpleIcon, PulseIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Caption,
  Card,
  CardContent,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ActivityClientError } from "./activity-browser-client.ts";
import { ActivityFeedList, ActivityFeedSkeleton } from "./activity-feed-list.tsx";
import { useOrganizationActivityFeedQuery } from "./activity-queries.ts";

const styles = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: "1.5rem",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1.25rem",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
  },
  error: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
  },
});

export type OrganizationActivityPageState =
  | { readonly status: "pending" }
  | { readonly status: "forbidden" }
  | { readonly status: "error"; readonly retry: () => void }
  | {
      readonly status: "success";
      readonly activities: readonly ActivityEntryDto[];
      readonly hasMore: boolean;
      readonly loadingMore: boolean;
      readonly loadMore: () => void;
    };

function FeedBody({
  state,
  now,
}: {
  readonly state: OrganizationActivityPageState;
  readonly now?: Date;
}) {
  const { t } = useI18n();
  switch (state.status) {
    case "pending":
      return (
        <Card>
          <CardContent className={styles.content}>
            <ActivityFeedSkeleton rows={8} />
          </CardContent>
        </Card>
      );
    case "forbidden":
      return (
        <EmptyState>
          <EmptyStateIcon>
            <LockSimpleIcon aria-hidden />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("activity.page.forbidden.title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("activity.page.forbidden.description")}
            </EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      );
    case "error":
      return (
        <div {...applyStyles(styles.error)} role="alert">
          <Caption>{t("activity.error")}</Caption>
          <Button dense onClick={state.retry} variant="outline">
            {t("common.retry")}
          </Button>
        </div>
      );
    case "success":
      if (state.activities.length === 0) {
        return (
          <EmptyState>
            <EmptyStateIcon>
              <PulseIcon aria-hidden />
            </EmptyStateIcon>
            <EmptyStateCopy>
              <EmptyStateTitle>{t("activity.page.empty.title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("activity.page.empty.description")}</EmptyStateDescription>
            </EmptyStateCopy>
          </EmptyState>
        );
      }
      return (
        <Card>
          <CardContent className={styles.content}>
            <ActivityFeedList
              label={t("activity.page.title")}
              activities={state.activities}
              now={now}
            />
            {state.hasMore ? (
              <div {...applyStyles(styles.footer)}>
                <Button
                  aria-busy={state.loadingMore || undefined}
                  disabled={state.loadingMore}
                  onClick={state.loadMore}
                  variant="outline"
                >
                  {state.loadingMore ? t("activity.page.loadingMore") : t("activity.page.loadMore")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      );
  }
}

/** Every activity of the organization, newest first, a page at a time. */
export function OrganizationActivityPageView({
  state,
  now,
}: {
  readonly state: OrganizationActivityPageState;
  readonly now?: Date;
}) {
  const { t } = useI18n();
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("activity.page.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("activity.page.description")}</PageHeaderDescription>
      </PageHeader>
      <FeedBody now={now} state={state} />
    </main>
  );
}

export function OrganizationActivityPage({ organizationId }: { readonly organizationId: string }) {
  const query = useOrganizationActivityFeedQuery(organizationId);
  let state: OrganizationActivityPageState;
  if (query.isPending) {
    state = { status: "pending" };
  } else if (query.isError) {
    state =
      query.error instanceof ActivityClientError && query.error.status === 403
        ? { status: "forbidden" }
        : { status: "error", retry: () => void query.refetch() };
  } else {
    state = {
      status: "success",
      activities: query.data.pages.flatMap((page) => page.activities),
      hasMore: query.hasNextPage,
      loadingMore: query.isFetchingNextPage,
      loadMore: () => void query.fetchNextPage(),
    };
  }
  return <OrganizationActivityPageView state={state} />;
}
