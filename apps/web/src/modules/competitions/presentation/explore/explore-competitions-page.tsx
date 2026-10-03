"use client";

import { Link } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import {
  useExploreCompetitionsInfiniteQuery,
  useMyAccessibleCompetitionsQuery,
} from "@/modules/competitions/presentation/competition-queries.ts";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ExploreCompetitionCard } from "./explore-competition-card.tsx";
import { ExploreCompetitionsEmpty } from "./explore-competitions-empty.tsx";
import { styles } from "./explore-competitions-page.styles.ts";
import { ExploreCompetitionsSkeleton } from "./explore-competitions-skeleton.tsx";
import { ExploreCompetitionsToolbar } from "./explore-competitions-toolbar.tsx";
import {
  clearedExploreSearch,
  exploreQueryFromSearch,
  hasActiveExploreFilters,
  type ExploreCompetitionsSearch,
} from "./explore-search.ts";
import { exploreViewerRelation } from "./explore-viewer-relation.ts";

export function PlayerCompetitionsExplorePage({
  search,
  onSearchChange,
}: {
  readonly search: ExploreCompetitionsSearch;
  readonly onSearchChange: (next: ExploreCompetitionsSearch) => void;
}) {
  const { t } = useI18n();
  const query = useExploreCompetitionsInfiniteQuery(exploreQueryFromSearch(search));
  const membershipsQuery = useMyMembershipsQuery();
  const accessibleQuery = useMyAccessibleCompetitionsQuery();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total;
  const nextCursor = query.data?.pages.at(-1)?.nextCursor ?? null;
  const showSkeleton = query.isPending && query.data === undefined;
  const showError = query.isError && query.data === undefined;
  const showEmpty = query.isSuccess && items.length === 0;
  const memberships = membershipsQuery.data?.memberships ?? [];
  const accessibleCompetitionIds =
    accessibleQuery.data?.competitions.map((item) => item.competition.id) ?? [];

  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.breadcrumb)}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/player/competitions" />}>
                {t("player.competitions.explore.breadcrumb.competitions")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("player.competitions.explore.breadcrumb.explore")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <PageHeader>
        <PageHeaderTitle>{t("player.competitions.explore.title")}</PageHeaderTitle>
        <PageHeaderDescription>
          {t("player.competitions.explore.description")}
        </PageHeaderDescription>
      </PageHeader>

      <div {...applyStyles(styles.body)}>
        <ExploreCompetitionsToolbar
          onSearchChange={onSearchChange}
          resultCount={showSkeleton ? undefined : total}
          search={search}
          t={t}
        />
        {showSkeleton ? <ExploreCompetitionsSkeleton /> : null}
        {showError ? (
          <Alert variant="destructive">
            <AlertDescription {...applyStyles(styles.error)}>
              <span>{t("player.competitions.explore.error")}</span>
              <Button onClick={() => void query.refetch()} variant="secondary">
                {t("player.competitions.explore.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {showEmpty ? (
          <ExploreCompetitionsEmpty
            filtered={hasActiveExploreFilters(search)}
            onClear={() => onSearchChange(clearedExploreSearch(search))}
          />
        ) : null}
        {items.length > 0 ? (
          <>
            <div {...applyStyles(styles.grid)}>
              {items.map((item) => (
                <ExploreCompetitionCard
                  item={item}
                  key={item.competition.id}
                  relation={exploreViewerRelation({
                    organizationId: item.organization.id,
                    competitionId: item.competition.id,
                    memberships,
                    accessibleCompetitionIds,
                  })}
                />
              ))}
            </div>
            {nextCursor ? (
              <Button
                className={styles.more}
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
                variant="outline"
              >
                {t("player.competitions.explore.more")}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
