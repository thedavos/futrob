"use client";

import { Link } from "@tanstack/react-router";
import {
  LockSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Card,
  CardContent,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OrganizationTeamsKpis } from "./organization-teams-kpis.tsx";
import { pageStyles } from "./organization-teams.styles.ts";

export function OrganizationTeamsForbidden({
  organizationId,
}: {
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  return (
    <EmptyState>
      <EmptyStateIcon>
        <span {...applyStyles(pageStyles.emptyIconIsland)}>
          <LockSimpleIcon aria-hidden="true" {...applyStyles(pageStyles.emptyIconGlyph)} />
        </span>
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("org.teams.forbidden.title")}</EmptyStateTitle>
        <EmptyStateDescription>{t("org.teams.forbidden.description")}</EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        <Button
          render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId" />}
          variant="outline"
        >
          {t("org.teams.forbidden.cta")}
        </Button>
      </EmptyStateActions>
    </EmptyState>
  );
}

function TableRowsSkeleton({ count }: { readonly count: number }) {
  return (
    <div aria-hidden="true" {...applyStyles(pageStyles.loadingRows)}>
      {Array.from({ length: count }, (_, row) => (
        <div key={row} {...applyStyles(pageStyles.loadingRow)}>
          <div {...applyStyles(pageStyles.loadingTeamCell)}>
            <Skeleton {...applyStyles(pageStyles.loadingAvatar)} />
            <Skeleton {...applyStyles(pageStyles.loadingText)} />
          </div>
          <div {...applyStyles(pageStyles.loadingChips)}>
            <Skeleton {...applyStyles(pageStyles.loadingChip)} />
            <Skeleton {...applyStyles(pageStyles.loadingChip)} />
          </div>
          <Skeleton {...applyStyles(pageStyles.loadingBadge)} />
          <Skeleton {...applyStyles(pageStyles.loadingDate)} />
        </div>
      ))}
    </div>
  );
}

export function OrganizationTeamsLoading() {
  const { t } = useI18n();
  return (
    <>
      <OrganizationTeamsKpis active="loading" pending="loading" total="loading" />
      <Card aria-busy="true">
        <div {...applyStyles(pageStyles.loadingHeader)}>
          <div {...applyStyles(pageStyles.loadingHeaderCopy)}>
            <Skeleton aria-hidden="true" {...applyStyles(pageStyles.loadingTitle)} />
            <Caption role="status">{t("org.teams.loading")}</Caption>
          </div>
          <div aria-hidden="true" {...applyStyles(pageStyles.loadingPills)}>
            <Skeleton {...applyStyles(pageStyles.loadingPill)} />
            <Skeleton {...applyStyles(pageStyles.loadingPill)} />
            <Skeleton {...applyStyles(pageStyles.loadingPill)} />
          </div>
        </div>
        <CardContent className={pageStyles.content}>
          <div aria-hidden="true" {...applyStyles(pageStyles.toolbar)}>
            <Skeleton {...applyStyles(pageStyles.loadingSearch)} />
            <Skeleton {...applyStyles(pageStyles.loadingSelect)} />
          </div>
          <TableRowsSkeleton count={5} />
        </CardContent>
      </Card>
    </>
  );
}

export function OrganizationTeamsFilterLoading() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" {...applyStyles(pageStyles.loadingRows)}>
      <Caption role="status">{t("org.teams.filterLoading")}</Caption>
      <TableRowsSkeleton count={3} />
    </div>
  );
}

export function OrganizationTeamsFilterUnavailable({
  kind,
  onClear,
  onRetry,
}: {
  readonly kind: "error" | "forbidden";
  readonly onClear: () => void;
  readonly onRetry?: () => void;
}) {
  const { t } = useI18n();
  const isError = kind === "error";
  return (
    <div {...applyStyles(pageStyles.noMatches)}>
      <EmptyState>
        <EmptyStateIcon>
          <span {...applyStyles(pageStyles.emptyIconIsland)}>
            {isError ? (
              <WarningCircleIcon aria-hidden="true" {...applyStyles(pageStyles.emptyIconGlyph)} />
            ) : (
              <LockSimpleIcon aria-hidden="true" {...applyStyles(pageStyles.emptyIconGlyph)} />
            )}
          </span>
        </EmptyStateIcon>
        <EmptyStateCopy>
          <EmptyStateTitle>
            {t(isError ? "org.teams.filterError.title" : "org.teams.filterForbidden.title")}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {t(
              isError
                ? "org.teams.filterError.description"
                : "org.teams.filterForbidden.description",
            )}
          </EmptyStateDescription>
        </EmptyStateCopy>
        <EmptyStateActions>
          {isError && onRetry ? (
            <Button onClick={onRetry} type="button" variant="outline">
              {t("common.retry")}
            </Button>
          ) : null}
          <Button onClick={onClear} type="button" variant="outline">
            {t("org.teams.noMatches.clearFilters")}
          </Button>
        </EmptyStateActions>
      </EmptyState>
    </div>
  );
}

export function OrganizationTeamsError({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div {...applyStyles(pageStyles.feedback)}>
      <Alert variant="destructive">
        <AlertDescription>{t("org.teams.error")}</AlertDescription>
      </Alert>
      <Button onClick={onRetry} type="button" variant="outline">
        {t("common.retry")}
      </Button>
    </div>
  );
}

export function OrganizationTeamsEmpty({
  organizationId,
  showCreateCompetition,
}: {
  readonly organizationId: string;
  readonly showCreateCompetition: boolean;
}) {
  const { t } = useI18n();
  return (
    <EmptyState fill>
      <EmptyStateIcon>
        <span {...applyStyles(pageStyles.emptyIconIsland)}>
          <UsersThreeIcon aria-hidden="true" {...applyStyles(pageStyles.emptyIconGlyph)} />
        </span>
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("org.teams.empty.title")}</EmptyStateTitle>
        <EmptyStateDescription>{t("org.teams.empty.description")}</EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        {showCreateCompetition ? (
          <Button
            render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId/competitions/new" />}
          >
            <PlusIcon aria-hidden="true" />
            {t("org.home.createCompetition")}
          </Button>
        ) : null}
        <Button
          render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId/competitions" />}
          variant={showCreateCompetition ? "outline" : "default"}
        >
          {t("org.teams.empty.cta")}
        </Button>
      </EmptyStateActions>
      <EmptyStateFooter>{t("org.teams.empty.hint")}</EmptyStateFooter>
    </EmptyState>
  );
}

export function OrganizationTeamsNoMatches({
  query,
  hasFacetFilter,
  onClear,
}: {
  readonly query: string;
  readonly hasFacetFilter: boolean;
  readonly onClear: () => void;
}) {
  const { t } = useI18n();
  const trimmed = query.trim();
  return (
    <div {...applyStyles(pageStyles.noMatches)}>
      <EmptyState>
        <EmptyStateIcon>
          <span {...applyStyles(pageStyles.emptyIconIsland)}>
            <MagnifyingGlassIcon aria-hidden="true" {...applyStyles(pageStyles.emptyIconGlyph)} />
          </span>
        </EmptyStateIcon>
        <EmptyStateCopy>
          <EmptyStateTitle>{t("org.teams.noMatches.title")}</EmptyStateTitle>
          <EmptyStateDescription>
            {trimmed.length > 0
              ? t("org.teams.noMatches.description", { query: trimmed })
              : t("org.teams.noMatches.descriptionFilters")}
          </EmptyStateDescription>
        </EmptyStateCopy>
        <EmptyStateActions>
          <Button onClick={onClear} type="button" variant="outline">
            {hasFacetFilter
              ? t("org.teams.noMatches.clearFilters")
              : t("org.teams.noMatches.clear")}
          </Button>
        </EmptyStateActions>
      </EmptyState>
    </div>
  );
}
