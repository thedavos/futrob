"use client";

import { Link } from "@tanstack/react-router";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
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
  useCompetitionTeamNamesQuery,
  useCompetitionTeamStatisticsQuery,
} from "./competition-team-stats-queries.ts";
import type { CompetitionTeamStatsState, TeamNamesState } from "./competition-team-stats-state.ts";
import { StatsReady, type TableControls } from "./competition-team-stats-ready.tsx";
import type { TeamStatsFormats } from "./competition-team-stats-table.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

const styles = stylex.create({
  ready: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    minWidth: 0,
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
  const figures = stats.data?.kind === "ok" ? stats.data.response : undefined;
  const teamNames = useCompetitionTeamNamesQuery(
    organizationId,
    competitionId,
    allowed && (figures?.teams.length ?? 0) > 0,
  );

  // Refusals come first: access decisions and stored server refusals win over cached figures.
  const state: CompetitionTeamStatsState = (() => {
    if (access.capability.status === "loading") return { kind: "loading" };
    if (access.capability.status === "unavailable") {
      return { kind: "error", reason: "access", retry: () => void access.query.refetch() };
    }
    if (!allowed) return { kind: "forbidden" };
    if (stats.data?.kind === "refused") return { kind: stats.data.refusal };
    if (figures) {
      return {
        kind: "ready",
        teams: figures.teams,
        refreshFailed: stats.isError ? { retry: () => void stats.refetch() } : null,
      };
    }
    if (stats.isError) {
      return { kind: "error", reason: "load", retry: () => void stats.refetch() };
    }
    return { kind: "loading" };
  })();

  // A names refusal falls back to team ids until a fresh success; the figures stay authorized by
  // their own endpoint. A recoverable failure keeps the last names and says the refresh failed.
  const names: TeamNamesState = (() => {
    const retry = () => void teamNames.refetch();
    if (teamNames.data?.kind === "denied") return { kind: "error", reason: "denied", retry };
    if (teamNames.data) {
      return {
        kind: "ready",
        names: teamNames.data.names,
        refreshFailed: teamNames.isError ? { retry } : null,
      };
    }
    if (teamNames.isError) return { kind: "error", reason: "load", retry };
    return { kind: "loading" };
  })();

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
          case "not_found":
            return (
              <RefusedEmptyState
                organizationId={organizationId}
                refusal={state.kind === "forbidden" ? "forbidden" : "notFound"}
                t={t}
              />
            );
          case "ready":
            return state.teams.length === 0 ? (
              <div {...applyStyles(styles.ready)}>
                {state.refreshFailed ? (
                  <RetryAlert
                    message={t("competition.teamStats.refreshFailed")}
                    retry={state.refreshFailed.retry}
                    t={t}
                    variant="warning"
                  />
                ) : null}
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
              </div>
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

function RefusedEmptyState({
  organizationId,
  refusal,
  t,
}: {
  readonly organizationId: string;
  readonly refusal: "forbidden" | "notFound";
  readonly t: Translator;
}) {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={accessUrl} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{t(`competition.teamStats.${refusal}.title`)}</EmptyStateTitle>
        <EmptyStateDescription>
          {t(`competition.teamStats.${refusal}.description`)}
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
