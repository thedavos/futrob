"use client";

import { Link } from "@tanstack/react-router";
import type {
  GetCompetitionRankingsResponse,
  RankingKindDto,
  RankingSnapshotDto,
} from "@futrob/api-contracts";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { TEAM_PERMISSION } from "@futrob/teams";
import {
  applyStyles,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
  TextLink,
} from "@futrob/ui";
import emptyRankingsUrl from "@/assets/illustration-empty-standings.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import { styles } from "./competition-rankings-page.styles.ts";
import { useCompetitionRankingsQuery, useRankingNames } from "./competition-rankings-queries.ts";
import { RankingMeta, RankingTable, RetryAlert } from "./competition-rankings-table.tsx";
import {
  RANKING_KIND_COPY,
  RANKING_KINDS,
  rankingFormatters,
  rankingTeamIds,
  selectRankingSnapshot,
  type RankingFormatters,
  type RankingNamesState,
} from "./competition-rankings-view.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

export type CompetitionRankingsState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly data: GetCompetitionRankingsResponse;
      readonly names: RankingNamesState;
      /** Set when a refresh failed: the last loaded rankings stay visible. */
      readonly refreshRetry: (() => void) | null;
    };

const RANKINGS_PERMISSIONS = [STATISTICS_PERMISSION.read, TEAM_PERMISSION.rosterRead] as const;

type KindSelection = {
  readonly rankingKind: RankingKindDto;
  readonly onRankingKindChange: (kind: RankingKindDto) => void;
};

export function CompetitionRankingsRoute(props: Scope & KindSelection) {
  const { organizationId, competitionId, rankingKind } = props;
  const access = useEffectivePermissions({ organizationId, competitionId }, RANKINGS_PERMISSIONS);
  const ready = access.capability.status === "ready";
  const canRead = ready && access.allowed.has(STATISTICS_PERMISSION.read);
  const canReadRosters = ready ? access.allowed.has(TEAM_PERMISSION.rosterRead) : null;

  const query = useCompetitionRankingsQuery(organizationId, competitionId, canRead);
  const loaded = query.data?.kind === "loaded" ? query.data.data : null;
  const teamIds = loaded ? rankingTeamIds(selectRankingSnapshot(loaded, rankingKind)) : [];
  const names = useRankingNames(organizationId, competitionId, teamIds, canReadRosters);

  const state: CompetitionRankingsState = (() => {
    if (access.capability.status === "unavailable") {
      return { kind: "error", retry: () => void access.query.refetch() };
    }
    if (access.capability.status === "loading") return { kind: "loading" };
    if (!canRead) return { kind: "forbidden" };
    if (query.data?.kind === "refused") return { kind: query.data.reason };
    if (loaded) {
      return {
        kind: "ready",
        data: loaded,
        names,
        refreshRetry: query.isError ? () => void query.refetch() : null,
      };
    }
    if (query.isError) return { kind: "error", retry: () => void query.refetch() };
    return { kind: "loading" };
  })();

  return <CompetitionRankingsPageView {...props} state={state} />;
}

export function CompetitionRankingsPageView({
  competitionId,
  organizationId,
  rankingKind,
  onRankingKindChange,
  state,
}: Scope & KindSelection & { readonly state: CompetitionRankingsState }) {
  const { locale, t } = useI18n();
  return (
    <PageScaffold page="competition.rankings">
      <div {...applyStyles(styles.content)}>
        {(() => {
          switch (state.kind) {
            case "loading":
              return (
                <div
                  aria-busy="true"
                  aria-label={t("competition.rankings.loading")}
                  role="status"
                  {...applyStyles(styles.content)}
                >
                  <Skeleton {...applyStyles(styles.skeletonTabs)} />
                  <Skeleton {...applyStyles(styles.skeletonTable)} />
                </div>
              );
            case "error":
              return (
                <RetryAlert message={t("competition.rankings.error")} retry={state.retry} t={t} />
              );
            case "forbidden":
              return (
                <EmptyState>
                  <EmptyStateIcon>
                    <img alt="" data-outline="none" src={accessUrl} />
                  </EmptyStateIcon>
                  <EmptyStateCopy>
                    <EmptyStateTitle>{t("competition.rankings.forbidden.title")}</EmptyStateTitle>
                    <EmptyStateDescription>
                      {t("competition.rankings.forbidden.description")}
                    </EmptyStateDescription>
                  </EmptyStateCopy>
                  <EmptyStateActions>
                    <TextLink
                      className={styles.exitLink}
                      render={
                        <Link
                          params={{ orgId: organizationId, competitionId }}
                          to="/orgs/$orgId/competitions/$competitionId"
                        />
                      }
                      text="label"
                    >
                      {t("competition.rankings.forbidden.back")}
                    </TextLink>
                  </EmptyStateActions>
                </EmptyState>
              );
            case "not_found":
              return (
                <EmptyState>
                  <EmptyStateIcon>
                    <img alt="" data-outline="none" src={accessUrl} />
                  </EmptyStateIcon>
                  <EmptyStateCopy>
                    <EmptyStateTitle>{t("competition.rankings.notFound.title")}</EmptyStateTitle>
                    <EmptyStateDescription>
                      {t("competition.rankings.notFound.description")}
                    </EmptyStateDescription>
                  </EmptyStateCopy>
                </EmptyState>
              );
            case "ready":
              return (
                <>
                  {state.refreshRetry ? (
                    <RetryAlert
                      message={t("competition.rankings.refreshError")}
                      retry={state.refreshRetry}
                      t={t}
                    />
                  ) : null}
                  {state.data.rankings.length === 0 ? (
                    <NotComputed t={t} />
                  ) : (
                    <RankingTabs
                      data={state.data}
                      formatters={rankingFormatters(locale)}
                      names={state.names}
                      onRankingKindChange={onRankingKindChange}
                      rankingKind={rankingKind}
                      t={t}
                    />
                  )}
                </>
              );
            default: {
              const exhaustive: never = state;
              return exhaustive;
            }
          }
        })()}
      </div>
    </PageScaffold>
  );
}

function RankingTabs({
  data,
  formatters,
  names,
  onRankingKindChange,
  rankingKind,
  t,
}: KindSelection & {
  readonly data: GetCompetitionRankingsResponse;
  readonly formatters: RankingFormatters;
  readonly names: RankingNamesState;
  readonly t: Translator;
}) {
  return (
    <Tabs
      className={styles.tabs}
      onValueChange={(value) => {
        const next = RANKING_KINDS.find((kind) => kind === value);
        if (next) onRankingKindChange(next);
      }}
      value={rankingKind}
    >
      <TabsList aria-label={t("competition.rankings.kinds")} className={styles.tabList}>
        {RANKING_KINDS.map((kind) => (
          <TabsTrigger key={kind} value={kind}>
            {t(RANKING_KIND_COPY[kind].tab)}
          </TabsTrigger>
        ))}
        <TabsIndicator />
      </TabsList>
      {RANKING_KINDS.map((kind) => (
        <TabsContent className={styles.panel} key={kind} value={kind}>
          <KindPanel
            formatters={formatters}
            kind={kind}
            names={names}
            snapshot={selectRankingSnapshot(data, kind)}
            t={t}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function KindPanel({
  formatters,
  kind,
  names,
  snapshot,
  t,
}: {
  readonly formatters: RankingFormatters;
  readonly kind: RankingKindDto;
  readonly names: RankingNamesState;
  readonly snapshot: RankingSnapshotDto | null;
  readonly t: Translator;
}) {
  if (!snapshot) return <NotComputed t={t} />;
  return (
    <>
      <RankingMeta formatters={formatters} kind={kind} snapshot={snapshot} t={t} />
      {snapshot.rows.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <img alt="" data-outline="none" src={emptyRankingsUrl} />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("competition.rankings.empty.title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("competition.rankings.empty.description")}
            </EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      ) : (
        <RankingTable formatters={formatters} kind={kind} names={names} snapshot={snapshot} t={t} />
      )}
    </>
  );
}

function NotComputed({ t }: { readonly t: Translator }) {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={emptyRankingsUrl} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("competition.rankings.notComputed.title")}</EmptyStateTitle>
        <EmptyStateDescription>
          {t("competition.rankings.notComputed.description")}
        </EmptyStateDescription>
      </EmptyStateCopy>
    </EmptyState>
  );
}
