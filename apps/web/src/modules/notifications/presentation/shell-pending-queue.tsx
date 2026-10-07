"use client";

import type { ActivityEntryDto } from "@futrob/api-contracts";
import { createLink } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueueTaskItem } from "@/shared/presentation/shell/queue-task-item.tsx";
import type { WorkspaceSelection } from "@/shared/presentation/shell/workspace-selection.ts";
import { usePendingActivitiesQuery } from "./activity-queries.ts";
import { pendingActivitySource } from "./activity-sources.ts";
import { activityRowView, formatActivityTime } from "./activity-view.ts";

const QueueTaskLink = createLink(QueueTaskItem);

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  empty: {
    paddingBlock: "1rem",
    paddingInline: 0,
  },
  error: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.5rem",
    paddingBlock: "0.5rem",
    paddingInline: "0.625rem",
  },
  skeletonRow: {
    display: "flex",
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    alignItems: "center",
    gap: "0.625rem",
    paddingInline: "0.625rem",
  },
  skeletonIcon: { width: "1rem", height: "1rem", flexShrink: 0 },
  skeletonLabel: { width: "70%", height: "0.75rem" },
});

export type PendingQueueState =
  | { readonly status: "pending" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "success"; readonly activities: readonly ActivityEntryDto[] };

/** Pending work of the active space, as `QueueTaskItem` rows. */
export function PendingQueueView({
  state,
  now = new Date(),
}: {
  readonly state: PendingQueueState;
  readonly now?: Date;
}) {
  const { locale, t } = useI18n();

  if (state.status === "pending") {
    return (
      <div aria-busy="true" aria-label={t("shell.queue.loading")} role="status">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} {...applyStyles(styles.skeletonRow)}>
            <Skeleton {...applyStyles(styles.skeletonIcon)} />
            <Skeleton {...applyStyles(styles.skeletonLabel)} />
          </div>
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div {...applyStyles(styles.error)} role="alert">
        <Caption>{t("shell.queue.error")}</Caption>
        <Button dense onClick={state.retry} variant="outline">
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (state.activities.length === 0) {
    const empty = applyStyles(styles.empty);
    return (
      <EmptyState className={empty.className} fill style={empty.style}>
        <EmptyStateCopy>
          <EmptyStateTitle>{t("shell.queue.empty.title")}</EmptyStateTitle>
          <EmptyStateDescription>{t("shell.queue.empty.description")}</EmptyStateDescription>
        </EmptyStateCopy>
      </EmptyState>
    );
  }

  return (
    <ul {...applyStyles(styles.list)}>
      {state.activities.map((activity) => {
        const view = activityRowView(activity, now);
        const shared = {
          icon: view.icon,
          title: t(view.titleKey),
          subtitle: view.subtitle ?? undefined,
          meta: formatActivityTime(view.at, locale, now),
          tone: view.tone,
        };
        return view.destination ? (
          <QueueTaskLink key={view.id} {...shared} {...view.destination} />
        ) : (
          <QueueTaskItem key={view.id} {...shared} disabled />
        );
      })}
    </ul>
  );
}

export function ShellPendingQueue({
  selection,
  allowedPermissions,
}: {
  readonly selection: WorkspaceSelection;
  readonly allowedPermissions: ReadonlySet<string>;
}) {
  const source = pendingActivitySource(selection, allowedPermissions);
  const query = usePendingActivitiesQuery(source);
  const state: PendingQueueState = query.isPending
    ? { status: "pending" }
    : query.isError
      ? { status: "error", retry: () => void query.refetch() }
      : { status: "success", activities: query.data.activities };
  return <PendingQueueView state={state} />;
}
