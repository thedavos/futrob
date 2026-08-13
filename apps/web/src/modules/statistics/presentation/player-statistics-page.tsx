"use client";

import { Link } from "@tanstack/react-router";
import type { PlayerPersonalStatsDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useMyStatisticsQuery } from "./statistics-queries.ts";

type StatisticMetric = keyof PlayerPersonalStatsDto["totals"];

const STATISTIC_METRICS = [
  "goals",
  "assists",
  "shots",
  "passAttempts",
  "passesMade",
  "tackleAttempts",
  "tacklesMade",
  "saves",
  "yellowCards",
  "redCards",
  "mvpAwards",
  "rating",
] as const satisfies readonly StatisticMetric[];

const METRIC_KEYS = {
  goals: "player.metric.goals",
  assists: "player.metric.assists",
  shots: "player.metric.shots",
  passAttempts: "player.metric.passAttempts",
  passesMade: "player.metric.passesMade",
  tackleAttempts: "player.metric.tackleAttempts",
  tacklesMade: "player.metric.tacklesMade",
  saves: "player.metric.saves",
  yellowCards: "player.metric.yellowCards",
  redCards: "player.metric.redCards",
  mvpAwards: "player.metric.mvpAwards",
  rating: "player.metric.rating",
} as const satisfies Record<StatisticMetric, ParameterlessMessageKey>;

export function PlayerStatisticsPage() {
  const { t, locale } = useI18n();
  const statisticsQuery = useMyStatisticsQuery();
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 2,
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader t={t} />

      {statisticsQuery.isPending ? (
        <StatisticsLoading t={t} />
      ) : statisticsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("player.statistics.error")}</span>
            <Button onClick={() => void statisticsQuery.refetch()} variant="secondary">
              {t("player.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : statisticsQuery.data.statistics === null ? (
        <OfficialHistoryEmpty t={t} />
      ) : (
        <StatisticsContent
          numberFormat={numberFormat}
          statistics={statisticsQuery.data.statistics}
          t={t}
        />
      )}
    </main>
  );
}

function PageHeader({ t }: { readonly t: Translator }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <p className="typo-label text-muted-foreground">{t("player.workspace.eyebrow")}</p>
        <h1 className="typo-heading">{t("player.statistics.title")}</h1>
        <p className="typo-subtitle text-muted-foreground">{t("player.statistics.description")}</p>
      </div>
      <Button render={<Link to="/player" />} variant="link">
        {t("player.backToWorkspace")}
      </Button>
    </div>
  );
}

function StatisticsLoading({ t }: { readonly t: Translator }) {
  return (
    <section aria-busy="true" aria-label={t("player.statistics.loading")} className="space-y-4">
      <p className="typo-caption text-muted-foreground">{t("player.statistics.loading")}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-72" />
    </section>
  );
}

function OfficialHistoryEmpty({ t }: { readonly t: Translator }) {
  return (
    <EmptyState>
      <EmptyStateTitle>{t("player.statistics.emptyTitle")}</EmptyStateTitle>
      <EmptyStateDescription>{t("player.official.emptyDescription")}</EmptyStateDescription>
      <EmptyStateActions>
        <Button render={<Link to="/player/game-accounts" />}>{t("player.gameData.review")}</Button>
      </EmptyStateActions>
    </EmptyState>
  );
}

function StatisticsContent({
  statistics,
  numberFormat,
  t,
}: {
  readonly statistics: PlayerPersonalStatsDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const hasPartialData = Object.values(statistics.partial).some(Boolean);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="typo-label">
              {t("player.statistics.matchesCount", { count: statistics.matchesPlayed })}
            </h2>
            <p className="typo-caption mt-1 text-muted-foreground">
              {t("player.statistics.revision", { revision: statistics.sourceRevisionMax })}
            </p>
          </div>
          {hasPartialData ? <Badge variant="warning">{t("player.partialData")}</Badge> : null}
        </div>
        <StatGroup>
          <Stat>
            <StatLabel>{t("player.metric.matches")}</StatLabel>
            <StatValue>{statistics.matchesPlayed}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t("player.metric.minutes")}</StatLabel>
            <StatValue>{numberFormat.format(statistics.minutes)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t("player.metric.goals")}</StatLabel>
            <StatValue>{numberFormat.format(statistics.totals.goals)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t("player.metric.assists")}</StatLabel>
            <StatValue>{numberFormat.format(statistics.totals.assists)}</StatValue>
          </Stat>
        </StatGroup>
      </section>

      {hasPartialData ? (
        <Alert>
          <AlertDescription>{t("player.partialData.description")}</AlertDescription>
        </Alert>
      ) : null}

      <Table aria-label={t("player.statistics.tableLabel")} dense>
        <TableHeader>
          <TableRow>
            <TableHead>{t("player.statistics.metric")}</TableHead>
            <TableHead className="text-right">{t("player.statistics.total")}</TableHead>
            <TableHead className="text-right">{t("player.statistics.average")}</TableHead>
            <TableHead className="text-right">{t("player.statistics.per90")}</TableHead>
            <TableHead>{t("player.statistics.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {STATISTIC_METRICS.map((metric) => (
            <TableRow key={metric}>
              <TableCell className="font-medium">{t(METRIC_KEYS[metric])}</TableCell>
              <TableCell className="typo-score text-right">
                {numberFormat.format(statistics.totals[metric])}
              </TableCell>
              <TableCell className="typo-score text-right">
                {formatNullableNumber(statistics.averages[metric], numberFormat, t)}
              </TableCell>
              <TableCell className="typo-score text-right">
                {formatNullableNumber(statistics.per90[metric], numberFormat, t)}
              </TableCell>
              <TableCell>
                {statistics.partial[metric] ? (
                  <Badge variant="warning">{t("player.partialData")}</Badge>
                ) : (
                  <span className="typo-caption text-muted-foreground">
                    {t("player.completeData")}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatNullableNumber(
  value: number | null,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string {
  return value === null ? t("player.noData") : numberFormat.format(value);
}
