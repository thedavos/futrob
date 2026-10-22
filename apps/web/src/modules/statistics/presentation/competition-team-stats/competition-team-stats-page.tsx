"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  SectionTitle,
  Skeleton,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import emptyStatsUrl from "@/assets/illustration-my-stats.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import {
  hasPartialTeamStats,
  type TeamStatsSort,
  type TeamStatsView,
} from "./competition-team-stats-model.ts";
import {
  teamStatisticsRefusal,
  useCompetitionTeamNamesQuery,
  useCompetitionTeamStatisticsQuery,
} from "./competition-team-stats-queries.ts";
import type { CompetitionTeamStatsState, TeamNamesState } from "./competition-team-stats-state.ts";
import { CompetitionTeamStatsSummary } from "./competition-team-stats-summary.tsx";
import {
  CompetitionTeamStatsTable,
  TeamStatsViewSelector,
  type TeamStatsFormats,
} from "./competition-team-stats-table.tsx";

const styles = stylex.create({
  ready: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    minWidth: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  sectionHead: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: { default: "flex-start", [media.md]: "flex-end" },
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  sectionCopy: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: 0,
  },
  alertRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  loadingGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  skeletonStat: {
    height: "6.5rem",
  },
  skeletonTable: {
    height: "16rem",
  },
});

type Scope = { readonly organizationId: string; readonly competitionId: string };

type TableControls = {
  readonly view: TeamStatsView;
  readonly sort: TeamStatsSort;
  readonly onViewChange: (view: TeamStatsView) => void;
  readonly onSortChange: (sort: TeamStatsSort) => void;
};

const READ_PERMISSIONS = [STATISTICS_PERMISSION.read] as const;

/**
 * Organizer read of official team statistics. EffectiveAccess decides whether the read
 * is attempted; the product API authorizes `statistics.read` again.
 */
export function CompetitionTeamStatsRoute(props: Scope & TableControls) {
  const { organizationId, competitionId } = props;
  const access = useEffectivePermissions({ organizationId, competitionId }, READ_PERMISSIONS);
  const allowed = access.allowed.has(STATISTICS_PERMISSION.read);
  const stats = useCompetitionTeamStatisticsQuery(organizationId, competitionId, allowed);
  const teamNames = useCompetitionTeamNamesQuery(
    organizationId,
    competitionId,
    allowed && (stats.data?.teams.length ?? 0) > 0,
  );

  const state: CompetitionTeamStatsState = (() => {
    if (access.capability.status === "loading") return { kind: "loading" };
    if (access.capability.status === "unavailable") {
      return { kind: "error", reason: "access", retry: () => void access.query.refetch() };
    }
    if (!allowed) return { kind: "forbidden" };
    if (stats.data) {
      return {
        kind: "ready",
        teams: stats.data.teams,
        refreshFailed: stats.isError ? { retry: () => void stats.refetch() } : null,
      };
    }
    if (stats.isError) {
      const refusal = teamStatisticsRefusal(stats.error);
      if (refusal) return { kind: refusal };
      return { kind: "error", reason: "load", retry: () => void stats.refetch() };
    }
    return { kind: "loading" };
  })();

  const names: TeamNamesState = teamNames.data
    ? { kind: "ready", names: teamNames.data }
    : teamNames.isError
      ? { kind: "error", retry: () => void teamNames.refetch() }
      : { kind: "loading" };

  return <CompetitionTeamStatsPageView {...props} names={names} state={state} />;
}

export function CompetitionTeamStatsPageView({
  competitionId,
  names,
  organizationId,
  state,
  ...controls
}: Scope &
  TableControls & { readonly names: TeamNamesState; readonly state: CompetitionTeamStatsState }) {
  const { locale, t } = useI18n();
  const intlLocale = locale === "en" ? "en-GB" : "es-ES";
  const formats: TeamStatsFormats = {
    count: new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }),
    rate: new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
  };
  const dateFormat = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const collator = new Intl.Collator(intlLocale, { sensitivity: "base", numeric: true });

  return (
    <PageScaffold page="competition.stats">
      {(() => {
        switch (state.kind) {
          case "loading":
            return <StatsLoading t={t} />;
          case "error":
            return (
              <RetryAlert
                message={t(
                  state.reason === "access"
                    ? "competition.teamStats.accessError"
                    : "competition.teamStats.error",
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
                  <EmptyStateTitle>{t("competition.teamStats.forbidden.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("competition.teamStats.forbidden.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                <EmptyStateActions>
                  <Button
                    render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId" />}
                    role="link"
                    variant="outline"
                  >
                    {t("competition.teamStats.forbidden.back")}
                  </Button>
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
                  <EmptyStateTitle>{t("competition.teamStats.notFound.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("competition.teamStats.notFound.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                <EmptyStateActions>
                  <Button
                    render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId" />}
                    role="link"
                    variant="outline"
                  >
                    {t("competition.teamStats.forbidden.back")}
                  </Button>
                </EmptyStateActions>
              </EmptyState>
            );
          case "ready":
            return state.teams.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={emptyStatsUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("competition.teamStats.empty.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("competition.teamStats.empty.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                <EmptyStateActions>
                  <Button
                    render={
                      <Link
                        params={{ orgId: organizationId, competitionId }}
                        to="/orgs/$orgId/competitions/$competitionId/encounters"
                      />
                    }
                    role="link"
                  >
                    {t("competition.teamStats.empty.action")}
                  </Button>
                </EmptyStateActions>
              </EmptyState>
            ) : (
              <StatsReady
                compareText={(a, b) => collator.compare(a, b)}
                controls={controls}
                dateFormat={dateFormat}
                formats={formats}
                names={names}
                state={state}
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

function StatsReady({
  compareText,
  controls,
  dateFormat,
  formats,
  names,
  state,
  t,
}: {
  readonly compareText: (a: string, b: string) => number;
  readonly controls: TableControls;
  readonly dateFormat: Intl.DateTimeFormat;
  readonly formats: TeamStatsFormats;
  readonly names: TeamNamesState;
  readonly state: Extract<CompetitionTeamStatsState, { kind: "ready" }>;
  readonly t: Translator;
}) {
  const titleId = useId();
  return (
    <div {...applyStyles(styles.ready)}>
      {state.refreshFailed ? (
        <RetryAlert
          message={t("competition.teamStats.refreshFailed")}
          retry={state.refreshFailed.retry}
          t={t}
          variant="warning"
        />
      ) : null}
      <CompetitionTeamStatsSummary
        dateFormat={dateFormat}
        formats={formats}
        names={names}
        t={t}
        teams={state.teams}
      />
      {hasPartialTeamStats(state.teams) ? (
        <Alert variant="warning">
          <AlertTitle>{t("competition.teamStats.partial.title")}</AlertTitle>
          <AlertDescription>{t("competition.teamStats.partial.description")}</AlertDescription>
        </Alert>
      ) : null}
      {names.kind === "error" ? (
        <RetryAlert message={t("competition.teamStats.teamName.error")} retry={names.retry} t={t} />
      ) : null}
      <section aria-labelledby={titleId} {...applyStyles(styles.section)}>
        <div {...applyStyles(styles.sectionHead)}>
          <div {...applyStyles(styles.sectionCopy)}>
            <SectionTitle id={titleId}>{t("competition.teamStats.comparison.title")}</SectionTitle>
            <Caption as="p">{t("competition.teamStats.comparison.description")}</Caption>
          </div>
          <TeamStatsViewSelector onViewChange={controls.onViewChange} t={t} view={controls.view} />
        </div>
        <CompetitionTeamStatsTable
          compareText={compareText}
          formats={formats}
          labelledBy={titleId}
          names={names}
          onSortChange={controls.onSortChange}
          sort={controls.sort}
          t={t}
          teams={state.teams}
          view={controls.view}
        />
      </section>
    </div>
  );
}

function RetryAlert({
  message,
  retry,
  t,
  variant = "destructive",
}: {
  readonly message: string;
  readonly retry: () => void;
  readonly t: Translator;
  readonly variant?: "destructive" | "warning";
}) {
  return (
    <Alert variant={variant}>
      <AlertDescription {...applyStyles(styles.alertRow)}>
        <span>{message}</span>
        <Button onClick={retry} variant="secondary">
          {t("common.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function StatsLoading({ t }: { readonly t: Translator }) {
  return (
    <section
      aria-busy="true"
      aria-label={t("competition.teamStats.loading")}
      {...applyStyles(styles.loading)}
    >
      <Caption as="p">{t("competition.teamStats.loading")}</Caption>
      <div {...applyStyles(styles.loadingGrid)}>
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
      </div>
      <Skeleton {...applyStyles(styles.skeletonTable)} />
    </section>
  );
}
