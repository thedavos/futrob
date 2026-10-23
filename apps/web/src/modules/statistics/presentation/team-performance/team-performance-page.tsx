"use client";

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { TeamPerformanceRankingSnapshotDto } from "@futrob/api-contracts";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
import accessUrl from "@/assets/illustration-permissions.png";
import emptyStandingsUrl from "@/assets/illustration-empty-standings.png";
import { useOrganizationTeamsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { invalidateEffectiveAccessQueries } from "@/shared/presentation/query/invalidate-effective-access.ts";
import {
  teamPerformanceRows,
  teamPerformanceSummary,
  type TeamPerformanceNames,
} from "./team-performance-model.ts";
import { useTeamPerformanceRankingQuery } from "./team-performance-queries.ts";
import { styles } from "./team-performance-page.styles.ts";
import { Criteria } from "./team-performance-criteria.tsx";
import { RankingTable } from "./team-performance-table.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

export type { TeamPerformanceNames } from "./team-performance-model.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

export type TeamPerformanceState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly cause: "access" | "load"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      /** Null until the first rebuild after an official result is approved. */
      readonly ranking: TeamPerformanceRankingSnapshotDto | null;
      /** Set when a background refresh failed and the cached ranking stays on screen. */
      readonly refreshRetry?: () => void;
    };

export function TeamPerformanceRoute(scope: Scope) {
  const queryClient = useQueryClient();
  const access = useCan(scope, STATISTICS_PERMISSION.read);
  const query = useTeamPerformanceRankingQuery(scope, access.allowed);
  const teamsQuery = useOrganizationTeamsQuery(scope.organizationId);

  const state: TeamPerformanceState = (() => {
    // Access is decided before any cached ranking is shown, so a revoked role never sees it.
    if (access.loading) return { kind: "loading" };
    if (access.unavailable) {
      return {
        kind: "error",
        cause: "access",
        retry: () => void invalidateEffectiveAccessQueries(queryClient),
      };
    }
    if (!access.allowed) return { kind: "forbidden" };
    const result = query.data;
    if (result?.kind === "refused") {
      return result.status === 401
        ? { kind: "error", cause: "load", retry: () => void query.refetch() }
        : { kind: "forbidden" };
    }
    if (result) {
      return {
        kind: "ready",
        ranking: result.response.ranking,
        refreshRetry: query.isRefetchError ? () => void query.refetch() : undefined,
      };
    }
    if (query.isError) return { kind: "error", cause: "load", retry: () => void query.refetch() };
    return { kind: "loading" };
  })();
  // Names follow the latest teams read: after any failure the cached list is not reused.
  const names: TeamPerformanceNames = teamsQuery.isError
    ? { kind: "unavailable" }
    : teamsQuery.data
      ? { kind: "ready", teams: teamsQuery.data.teams }
      : { kind: "loading" };

  return <TeamPerformancePageView {...scope} names={names} state={state} />;
}

export function TeamPerformancePageView({
  competitionId,
  names,
  organizationId,
  state,
}: Scope & { readonly state: TeamPerformanceState; readonly names: TeamPerformanceNames }) {
  const { t } = useI18n();
  return (
    <PageScaffold page="competition.teamPerformance">
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("teamPerformance.loading")}
                role="status"
                {...applyStyles(styles.skeletonStack)}
              >
                <Skeleton {...applyStyles(styles.skeletonRow)} />
                <Skeleton {...applyStyles(styles.skeletonRow)} />
                <Skeleton {...applyStyles(styles.skeletonRow)} />
              </div>
            );
          case "error":
            return (
              <RetryAlert
                message={t(
                  state.cause === "access"
                    ? "teamPerformance.accessError"
                    : "teamPerformance.error",
                )}
                retry={state.retry}
                t={t}
              />
            );
          case "forbidden":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={accessUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("teamPerformance.forbidden.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("teamPerformance.forbidden.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                <EmptyStateActions>
                  <Button
                    nativeButton={false}
                    // Navigates; Base UI would otherwise announce the anchor as a button.
                    role="link"
                    render={
                      <Link
                        params={{ orgId: organizationId, competitionId }}
                        to="/orgs/$orgId/competitions/$competitionId"
                      />
                    }
                    variant="outline"
                  >
                    {t("teamPerformance.backToCompetition")}
                  </Button>
                </EmptyStateActions>
              </EmptyState>
            );
          case "ready":
            if (!state.ranking) {
              return (
                <div {...applyStyles(styles.content)}>
                  {state.refreshRetry ? (
                    <RetryAlert
                      message={t("teamPerformance.refreshError")}
                      retry={state.refreshRetry}
                      t={t}
                    />
                  ) : null}
                  <EmptyState>
                    <EmptyStateIcon>
                      <img alt="" data-outline="none" src={emptyStandingsUrl} />
                    </EmptyStateIcon>
                    <EmptyStateCopy>
                      <EmptyStateTitle>{t("teamPerformance.notBuilt.title")}</EmptyStateTitle>
                      <EmptyStateDescription>
                        {t("teamPerformance.notBuilt.description")}
                      </EmptyStateDescription>
                    </EmptyStateCopy>
                    <EmptyStateActions>
                      <Button
                        nativeButton={false}
                        // Navigates; Base UI would otherwise announce the anchor as a button.
                        role="link"
                        render={
                          <Link
                            params={{ orgId: organizationId, competitionId }}
                            to="/orgs/$orgId/competitions/$competitionId/encounters"
                          />
                        }
                        variant="outline"
                      >
                        {t("teamPerformance.notBuilt.action")}
                      </Button>
                    </EmptyStateActions>
                  </EmptyState>
                </div>
              );
            }
            return (
              <RankingContent
                competitionId={competitionId}
                names={names}
                organizationId={organizationId}
                ranking={state.ranking}
                refreshRetry={state.refreshRetry}
                t={t}
              />
            );
          default: {
            const exhaustive: never = state;
            return exhaustive;
          }
        }
      })()}
    </PageScaffold>
  );
}

function RankingContent({
  competitionId,
  names,
  organizationId,
  ranking,
  refreshRetry,
  t,
}: Scope & {
  readonly names: TeamPerformanceNames;
  readonly ranking: TeamPerformanceRankingSnapshotDto;
  readonly refreshRetry?: () => void;
  readonly t: Translator;
}) {
  const nameMap = useMemo(
    () => new Map(names.kind === "ready" ? names.teams.map((team) => [team.id, team.name]) : []),
    [names],
  );
  const rows = teamPerformanceRows(ranking, nameMap);
  const summary = teamPerformanceSummary(ranking);
  return (
    <div {...applyStyles(styles.content)}>
      {refreshRetry ? (
        <RetryAlert message={t("teamPerformance.refreshError")} retry={refreshRetry} t={t} />
      ) : null}
      {ranking.projectionComplete ? null : (
        <Alert variant="warning">
          <AlertTitle>{t("teamPerformance.projectionIncomplete.title")}</AlertTitle>
          <AlertDescription>
            {t("teamPerformance.projectionIncomplete.description")}
          </AlertDescription>
        </Alert>
      )}
      {ranking.unmatchedContributions > 0 ? (
        <Alert variant="info">
          <AlertDescription>
            {t("teamPerformance.unmatched", { count: ranking.unmatchedContributions })}
          </AlertDescription>
        </Alert>
      ) : null}
      {names.kind === "unavailable" ? (
        <Alert>
          <AlertDescription>{t("teamPerformance.teamsUnavailable")}</AlertDescription>
        </Alert>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <img alt="" data-outline="none" src={emptyStandingsUrl} />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("teamPerformance.empty.title")}</EmptyStateTitle>
            <EmptyStateDescription>{t("teamPerformance.empty.description")}</EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      ) : (
        <RankingTable
          minimum={ranking.window.minimumEncounters}
          names={names}
          rows={rows}
          summary={t("teamPerformance.table.summary", summary)}
          t={t}
        />
      )}
      <Criteria
        competitionId={competitionId}
        organizationId={organizationId}
        ranking={ranking}
        t={t}
      />
    </div>
  );
}
