"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import { LockSimpleIcon, UsersThreeIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold, type ScaffoldPageId } from "@/shared/presentation/page-scaffold.tsx";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import type { CaptainLinks } from "./captain-links.tsx";
import type { CaptainTeamAccess } from "./captain-team-access.ts";
import { styles } from "./captain-page.styles.ts";

const skeletonStats = applyStyles(styles.skeletonStats);
const skeletonTable = applyStyles(styles.skeletonTable);

type CaptainPage = Extract<ScaffoldPageId, `captain.${string}`>;

/**
 * Header plus every state a captain page can be in: loading, no team, no access, access check
 * failed, and, once ready, the team detail with its own loading and error handling.
 */
export function CaptainPageFrame<Detail>({
  page,
  access,
  forbiddenKey,
  links,
  actions,
  detail,
  error,
  onRetry,
  onRetryDetail,
  children,
}: Readonly<{
  page: CaptainPage;
  access: CaptainTeamAccess;
  /** Explains who may use the page when the actor lacks the permission. */
  forbiddenKey: ParameterlessMessageKey;
  links: CaptainLinks;
  /** Header actions, rendered only when access is ready. */
  actions?: ReactNode;
  detail: Detail | null;
  error: SupportError | null;
  onRetry: () => void;
  onRetryDetail: () => void;
  children: (detail: Detail) => ReactNode;
}>) {
  const { t } = useI18n();
  const ready = access.kind === "ready";
  return (
    <PageScaffold actions={ready ? actions : null} page={page}>
      <div {...applyStyles(styles.content)}>
        {ready ? (
          <>
            {error ? (
              <div {...applyStyles(styles.errorBlock)}>
                <SupportErrorAlert error={error} />
                <Button onClick={onRetryDetail} type="button" variant="outline">
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}
            {detail ? children(detail) : error ? null : <CaptainPageSkeleton />}
          </>
        ) : null}
        {access.kind === "loading" ? <CaptainPageSkeleton /> : null}
        {access.kind === "no-team" ? (
          <EmptyState>
            <EmptyStateIcon>
              <UsersThreeIcon />
            </EmptyStateIcon>
            <EmptyStateCopy>
              <EmptyStateTitle>{t("captain.noTeam.title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("captain.noTeam.description")}</EmptyStateDescription>
            </EmptyStateCopy>
            <EmptyStateActions>
              <Button render={<Link to="/invitations" />} role="link" variant="outline">
                {t("captain.noTeam.action")}
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : null}
        {access.kind === "forbidden" ? (
          <EmptyState>
            <EmptyStateIcon>
              <LockSimpleIcon />
            </EmptyStateIcon>
            <EmptyStateCopy>
              <EmptyStateTitle>{t("captain.forbidden.title")}</EmptyStateTitle>
              <EmptyStateDescription>{t(forbiddenKey)}</EmptyStateDescription>
            </EmptyStateCopy>
            <EmptyStateActions>
              <Button render={links.team} role="link" variant="outline">
                {t("captain.forbidden.action")}
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : null}
        {access.kind === "unavailable" ? (
          <EmptyState>
            <EmptyStateIcon>
              <WarningCircleIcon />
            </EmptyStateIcon>
            <EmptyStateCopy>
              <EmptyStateTitle>{t("captain.unavailable.title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("captain.unavailable.description")}</EmptyStateDescription>
            </EmptyStateCopy>
            <EmptyStateActions>
              <Button onClick={onRetry} type="button" variant="outline">
                {t("common.retry")}
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : null}
      </div>
    </PageScaffold>
  );
}

export function CaptainPageSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-label={t("captain.loading")} role="status" {...applyStyles(styles.loading)}>
      <Skeleton className={skeletonStats.className} style={skeletonStats.style} />
      <Skeleton className={skeletonTable.className} style={skeletonTable.style} />
    </div>
  );
}
