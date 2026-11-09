"use client";

import { ChartPieIcon, HandshakeIcon, SoccerBallIcon, StarIcon } from "@phosphor-icons/react";
import type { GetMyStatisticsResponse, PlayerPersonalStatsDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Caption,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  StatHint,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import emptyStatsUrl from "@/assets/illustration-my-stats.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import { useMyStatisticsQuery } from "./statistics-queries.ts";

const styles = stylex.create({
  stack: {
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
});

type RefreshFailure = { readonly retry: () => void };

export type PlayerCompetitionStatsView =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "empty"; readonly refreshFailed: RefreshFailure | null }
  | {
      readonly kind: "ready";
      readonly stats: PlayerPersonalStatsDto;
      readonly refreshFailed: RefreshFailure | null;
    };

function playerCompetitionStatsView(input: {
  readonly data: GetMyStatisticsResponse | undefined;
  readonly isError: boolean;
  readonly refetch: () => Promise<void>;
}): PlayerCompetitionStatsView {
  const retry = () => {
    void input.refetch();
  };
  const refreshFailed = input.isError ? { retry } : null;
  const statistics = input.data?.statistics;
  if (input.data && statistics) {
    return { kind: "ready", stats: statistics, refreshFailed };
  }
  if (input.data) {
    return { kind: "empty", refreshFailed };
  }
  if (input.isError) {
    return { kind: "error", retry };
  }
  return { kind: "loading" };
}

export function PlayerCompetitionStatsPage({ competitionId }: { readonly competitionId: string }) {
  const query = useMyStatisticsQuery({ competitionId });
  return (
    <PlayerCompetitionStatsPageView
      view={playerCompetitionStatsView({
        data: query.data,
        isError: query.isError,
        refetch: async () => {
          await query.refetch();
        },
      })}
    />
  );
}

export function PlayerCompetitionStatsPageView({
  view,
}: {
  readonly view: PlayerCompetitionStatsView;
}) {
  const { locale, t } = useI18n();
  const intlLocale = locale === "en" ? "en-GB" : "es-ES";
  const count = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 });
  const rate = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 });

  return (
    <PageScaffold page="competitionPlayer.stats">
      <PlayerCompetitionStatsBody count={count} rate={rate} t={t} view={view} />
    </PageScaffold>
  );
}

function PlayerCompetitionStatsBody({
  count,
  rate,
  t,
  view,
}: {
  readonly count: Intl.NumberFormat;
  readonly rate: Intl.NumberFormat;
  readonly t: Translator;
  readonly view: PlayerCompetitionStatsView;
}) {
  switch (view.kind) {
    case "loading":
      return <StatsLoading t={t} />;
    case "error":
      return <RetryAlert message={t("player.statistics.error")} retry={view.retry} t={t} />;
    case "empty":
      return (
        <div {...applyStyles(styles.stack)}>
          {view.refreshFailed ? (
            <RetryAlert
              message={t("player.competitionStats.refreshFailed")}
              retry={view.refreshFailed.retry}
              t={t}
              variant="warning"
            />
          ) : null}
          <OfficialStatsEmpty t={t} />
        </div>
      );
    case "ready":
      return (
        <div {...applyStyles(styles.stack)}>
          {view.refreshFailed ? (
            <RetryAlert
              message={t("player.competitionStats.refreshFailed")}
              retry={view.refreshFailed.retry}
              t={t}
              variant="warning"
            />
          ) : null}
          <OfficialStatsSummary count={count} rate={rate} stats={view.stats} t={t} />
          {Object.values(view.stats.partial).some(Boolean) ? (
            <Alert variant="warning">
              <AlertDescription>{t("player.partialData.description")}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      );
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

function OfficialStatsSummary({
  count,
  rate,
  stats,
  t,
}: {
  readonly count: Intl.NumberFormat;
  readonly rate: Intl.NumberFormat;
  readonly stats: PlayerPersonalStatsDto;
  readonly t: Translator;
}) {
  const goalsAverage = stats.averages.goals;
  const assistsAverage = stats.averages.assists;
  const rating = stats.averages.rating;

  return (
    <section aria-label={t("player.statistics.summary")}>
      <ProfileKpiGroup>
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          hint={
            stats.partial.minutes ? null : (
              <StatHint>
                {t("player.matchDetail.minutesPlayed", { minutes: stats.minutes })}
              </StatHint>
            )
          }
          icon={ChartPieIcon}
          label={t("player.metric.matches")}
          value={count.format(stats.matchesPlayed)}
        />
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          hint={rating === null ? null : <StatHint>{t("player.statistics.rating.hint")}</StatHint>}
          icon={StarIcon}
          label={t("player.metric.rating")}
          value={rating === null ? null : rate.format(rating)}
        />
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          hint={
            goalsAverage === null ? null : (
              <StatHint>
                {t("player.statistics.goals.hint", { average: rate.format(goalsAverage) })}
              </StatHint>
            )
          }
          icon={SoccerBallIcon}
          label={t("player.metric.goals")}
          value={goalsAverage === null ? null : count.format(stats.totals.goals)}
        />
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          hint={
            assistsAverage === null ? null : (
              <StatHint>
                {t("player.statistics.assists.hint", { average: rate.format(assistsAverage) })}
              </StatHint>
            )
          }
          icon={HandshakeIcon}
          label={t("player.metric.assists")}
          value={assistsAverage === null ? null : count.format(stats.totals.assists)}
        />
      </ProfileKpiGroup>
    </section>
  );
}

function OfficialStatsEmpty({ t }: { readonly t: Translator }) {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={emptyStatsUrl} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("player.competitionStats.emptyTitle")}</EmptyStateTitle>
        <EmptyStateDescription>
          {t("player.competitionStats.emptyDescription")}
        </EmptyStateDescription>
      </EmptyStateCopy>
    </EmptyState>
  );
}

function StatsLoading({ t }: { readonly t: Translator }) {
  return (
    <section
      aria-busy="true"
      aria-label={t("player.statistics.loading")}
      {...applyStyles(styles.loading)}
    >
      <Caption as="p">{t("player.statistics.loading")}</Caption>
      <div {...applyStyles(styles.loadingGrid)}>
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
      </div>
    </section>
  );
}
