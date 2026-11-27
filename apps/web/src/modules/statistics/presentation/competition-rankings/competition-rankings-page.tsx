"use client";

import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type {
  GetCompetitionRankingsResponse,
  RankingKindDto,
  RankingSnapshotDto,
} from "@futrob/api-contracts";
import { competitionRankingTeamIds, type RankingRowFilters } from "@futrob/sdk";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import {
  applyStyles,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
  TextLink,
  useExternalSync,
  vis,
} from "@futrob/ui";
import emptyRankingsUrl from "@/assets/illustration-empty-standings.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import { styles } from "./competition-rankings-page.styles.ts";
import { useCompetitionRankingsQuery, useRankingNames } from "./competition-rankings-queries.ts";
import { RankingPlayerDetail } from "./competition-rankings-player-detail.tsx";
import { RankingSummary } from "./competition-rankings-summary.tsx";
import {
  RankingMeta,
  RankingTable,
  type RankingFilterControls,
  type RankingSelection,
} from "./competition-rankings-table.tsx";
import { CompetitionRankingsSkeleton } from "./competition-rankings-skeleton.tsx";
import {
  RANKING_KIND_COPY,
  RANKING_KINDS,
  rankingFormatters,
  rankingNamesOf,
  selectRankingSnapshot,
  type RankingFormatters,
  type RankingNamesState,
} from "./competition-rankings-view.ts";
import { useRankingDetailHost, type RankingDetailHost } from "./competition-rankings-viewport.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

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

const RANKINGS_PERMISSIONS = [STATISTICS_PERMISSION.read] as const;

type KindSelection = {
  readonly rankingKind: RankingKindDto;
  readonly onRankingKindChange: (kind: RankingKindDto) => void;
};

export function CompetitionRankingsRoute(props: Scope & KindSelection) {
  const { organizationId, competitionId } = props;
  const access = useEffectivePermissions({ organizationId, competitionId }, RANKINGS_PERMISSIONS);
  const ready = access.capability.status === "ready";
  const canRead = ready && access.allowed.has(STATISTICS_PERMISSION.read);

  const query = useCompetitionRankingsQuery(organizationId, competitionId, canRead);
  const loaded = query.data?.kind === "loaded" ? query.data.data : null;
  // Every kind's Teams: the summary, the Team filter and the cross-ranking detail name rows of
  // any kind. Roster access is decided per Team by the roster endpoint, not at competition scope.
  const teamIds = loaded ? competitionRankingTeamIds(loaded) : [];
  const names = useRankingNames(organizationId, competitionId, teamIds, canRead);

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
  const isLoading = state.kind === "loading";
  const statusRef = useRef<HTMLSpanElement>(null);
  const loadingMessage = isLoading ? t("competition.rankings.loading") : "";

  // ARIA22: keep the live region mounted outside aria-busy and populate post-mount so screen
  // readers announce initial loading as well as clearing once data resolves.
  useExternalSync(() => {
    if (statusRef.current) {
      statusRef.current.textContent = loadingMessage;
    }
  }, [loadingMessage]);

  return (
    <PageScaffold page="competition.rankings">
      <span ref={statusRef} role="status" {...applyStyles(vis.srOnly)} />
      <div aria-busy={isLoading || undefined} {...applyStyles(styles.content)}>
        {(() => {
          switch (state.kind) {
            case "loading":
              return <CompetitionRankingsSkeleton rankingKind={rankingKind} t={t} />;
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
  // Selection and filters outlive a tab change: the detail compares one player across kinds.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RankingRowFilters>({ query: "", teamId: null });
  const host = useRankingDetailHost();
  const selection: RankingSelection = { selectedId, onSelect: setSelectedId };
  const filterControls: RankingFilterControls = {
    filters,
    onFiltersChange: setFilters,
    teams: [...rankingNamesOf(names).teams]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, t.locale)),
  };
  return (
    <>
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
              data={data}
              filterControls={filterControls}
              formatters={formatters}
              host={host}
              kind={kind}
              names={names}
              selection={selection}
              snapshot={selectRankingSnapshot(data, kind)}
              t={t}
            />
          </TabsContent>
        ))}
      </Tabs>
      {host === "aside" ? null : (
        <RankingPlayerDetail
          data={data}
          formatters={formatters}
          host={host}
          kind={rankingKind}
          names={names}
          onClose={() => setSelectedId(null)}
          selectedId={selectedId}
          t={t}
        />
      )}
    </>
  );
}

function KindPanel({
  data,
  filterControls,
  formatters,
  host,
  kind,
  names,
  selection,
  snapshot,
  t,
}: {
  readonly data: GetCompetitionRankingsResponse;
  readonly filterControls: RankingFilterControls;
  readonly formatters: RankingFormatters;
  readonly host: RankingDetailHost;
  readonly kind: RankingKindDto;
  readonly names: RankingNamesState;
  readonly selection: RankingSelection;
  readonly snapshot: RankingSnapshotDto | null;
  readonly t: Translator;
}) {
  const rows = snapshot?.rows.length ?? 0;
  // On wide screens the detail stays beside any kind while a player is selected: an empty or
  // not yet computed kind still shows where the player stands in the others.
  const aside =
    host === "aside" && (rows > 0 || selection.selectedId !== null) ? (
      <RankingPlayerDetail
        data={data}
        formatters={formatters}
        host="aside"
        kind={kind}
        names={names}
        onClose={() => undefined}
        selectedId={selection.selectedId}
        t={t}
      />
    ) : null;
  const main = (() => {
    if (!snapshot) return <NotComputed t={t} />;
    if (rows === 0) {
      return (
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
      );
    }
    return (
      <RankingTable
        filterControls={filterControls}
        formatters={formatters}
        kind={kind}
        names={names}
        selection={selection}
        snapshot={snapshot}
        t={t}
      />
    );
  })();
  return (
    <>
      {snapshot && rows > 0 ? (
        <RankingSummary formatters={formatters} names={names} snapshot={snapshot} t={t} />
      ) : null}
      {snapshot ? (
        <RankingMeta formatters={formatters} kind={kind} snapshot={snapshot} t={t} />
      ) : null}
      {aside ? (
        <div {...applyStyles(styles.workspace)}>
          <div {...applyStyles(styles.workspaceMain)}>{main}</div>
          {aside}
        </div>
      ) : (
        main
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
