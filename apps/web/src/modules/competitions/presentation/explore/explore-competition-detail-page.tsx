"use client";

import { Link } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
  TextLink,
  typography,
  useCopyToClipboard,
} from "@futrob/ui";
import { ShareNetworkIcon } from "@phosphor-icons/react";
import trophyUrl from "@/assets/trophy.png";
import { CompetitionsClientError } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { useExploreCompetitionQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import {
  competitionFormatLabel,
  competitionListBadgeVariant,
  competitionPlatformLabel,
  competitionRegionLabel,
  competitionScheduleLabel,
  competitionStatusLabel,
  competitionTeamsLabel,
} from "@/modules/competitions/presentation/competition-labels.ts";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ExploreCompetitionApplication } from "./explore-competition-application.tsx";
import { styles } from "./explore-competitions-page.styles.ts";
import { exploreCompetitionShareUrl } from "./explore-search.ts";
import { EXPLORE_ACTIONS, exploreViewerRelation } from "./explore-viewer-relation.ts";

export function ExploreCompetitionDetailPage({
  competitionId,
}: {
  readonly competitionId: string;
}) {
  const { locale, t } = useI18n();
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const query = useExploreCompetitionQuery(competitionId);
  const membershipsQuery = useMyMembershipsQuery();
  const item = query.data;
  const notFound =
    query.isError &&
    query.error instanceof CompetitionsClientError &&
    (query.error.status === 404 || query.error.code === "competitions.not_discoverable");
  const relation = item
    ? exploreViewerRelation({
        organizationId: item.organization.id,
        competitionId: item.competition.id,
        memberships: membershipsQuery.data?.memberships ?? [],
        accessibleCompetitionIds: [],
      })
    : "visitor";
  const actions = EXPLORE_ACTIONS[relation];
  const scheduleLabel = item
    ? competitionScheduleLabel(item.competition.schedule, locale, t)
    : null;

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
              <BreadcrumbLink render={<Link to="/player/competitions/explore" />}>
                {t("player.competitions.explore.breadcrumb.explore")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {item?.competition.name ?? t("player.competitions.detail.loading")}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {query.isPending ? <DetailSkeleton /> : null}
      {notFound ? <DetailNotFound /> : null}
      {query.isError && !notFound ? (
        <Alert variant="destructive">
          <AlertDescription {...applyStyles(styles.error)}>
            <span>{t("player.competitions.detail.error")}</span>
            <Button onClick={() => void query.refetch()} variant="secondary">
              {t("player.competitions.explore.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {item ? (
        <>
          <PageHeader>
            <PageHeaderTitle>{item.competition.name}</PageHeaderTitle>
            <PageHeaderDescription>
              <Badge variant={competitionListBadgeVariant(item.competition.status)}>
                {competitionStatusLabel(item.competition.status, t)}
              </Badge>
            </PageHeaderDescription>
            <PageHeaderActions>
              <div {...applyStyles(styles.detailActions)}>
                <Button
                  onClick={() =>
                    void copyToClipboard(exploreCompetitionShareUrl(item.competition.id))
                  }
                  variant="outline"
                >
                  <ShareNetworkIcon aria-hidden />
                  {isCopied
                    ? t("player.competitions.detail.shareCopied")
                    : t("player.competitions.detail.share")}
                </Button>
                {actions.manage ? (
                  <TextLink
                    render={
                      <Link
                        params={{
                          orgId: item.organization.id,
                          competitionId: item.competition.id,
                        }}
                        to="/orgs/$orgId/competitions/$competitionId"
                      />
                    }
                  >
                    {t("player.competitions.detail.manage")}
                  </TextLink>
                ) : null}
              </div>
            </PageHeaderActions>
          </PageHeader>
          <dl {...applyStyles(styles.detailList)}>
            <DetailItem
              label={t("player.competitions.detail.meta.format")}
              value={competitionFormatLabel(item.competition.format, t)}
            />
            <DetailItem
              label={t("player.competitions.detail.meta.region")}
              value={competitionRegionLabel(item.competition.region, t)}
            />
            <DetailItem
              label={t("player.competitions.detail.meta.platform")}
              value={competitionPlatformLabel(item.competition.platform)}
            />
            <DetailItem
              label={t("player.competitions.detail.meta.edition")}
              value={item.competition.gameEdition}
            />
            <DetailItem
              label={t("player.competitions.detail.meta.timeZone")}
              value={item.competition.timeZone}
            />
            <DetailItem
              label={t("player.competitions.detail.meta.organizer")}
              value={item.organization.name}
            />
            <DetailItem
              label={t("player.competitions.detail.meta.teams")}
              value={competitionTeamsLabel(item.approvedTeamCount, item.competition.teams.max, t)}
            />
            {scheduleLabel ? (
              <DetailItem
                label={t("player.competitions.detail.meta.startsOn")}
                value={scheduleLabel}
              />
            ) : null}
          </dl>
          {actions.manage ? null : (
            <ExploreCompetitionApplication
              competitionId={item.competition.id}
              status={item.competition.status}
            />
          )}
        </>
      ) : null}
    </main>
  );
}

function DetailItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div {...applyStyles(styles.detailItem)}>
      <dt {...applyStyles(typography.caption, styles.detailTerm)}>{label}</dt>
      <dd {...applyStyles(typography.body)}>{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  const { t } = useI18n();
  return (
    <div
      aria-busy="true"
      aria-label={t("player.competitions.detail.loading")}
      role="status"
      {...applyStyles(styles.body)}
    >
      <Skeleton {...applyStyles(styles.skeletonTitle)} />
      <Skeleton {...applyStyles(styles.skeletonLine)} />
      <div {...applyStyles(styles.detailList)}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} {...applyStyles(styles.skeletonMeta)} />
        ))}
      </div>
    </div>
  );
}

function DetailNotFound() {
  const { t } = useI18n();
  return (
    <EmptyState fill>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={trophyUrl} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("player.competitions.detail.notFound.title")}</EmptyStateTitle>
        <EmptyStateDescription>
          {t("player.competitions.detail.notFound.subtitle")}
        </EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        <Button render={<Link to="/player/competitions/explore" />} variant="outline">
          {t("player.competitions.detail.notFound.cta")}
        </Button>
      </EmptyStateActions>
    </EmptyState>
  );
}
