"use client";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Stat,
  StatLabel,
} from "@futrob/ui";
import { StarIcon } from "@phosphor-icons/react";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { AverageRatingRing } from "./player-match-performance.tsx";
import {
  providerPositionLabelKey,
  type PlayedAppearance,
  type ProviderMatchDetailModel,
} from "./provider-match-detail-model.ts";
import { TeamComparisonCard } from "./provider-match-detail-summary-comparison.tsx";
import {
  MatchHighlightsCard,
  SUMMARY_CARD_CONTENT_CLASS,
  SUMMARY_CARD_HEADER_CLASS,
} from "./provider-match-detail-summary-highlights.tsx";

export function MatchDetailSummary({
  model,
  numberFormat,
  t,
}: {
  readonly model: ProviderMatchDetailModel;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const percentFormat = new Intl.NumberFormat(numberFormat.resolvedOptions().locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <YourPerformanceCard appearance={model.appearance} numberFormat={numberFormat} t={t} />
        <MatchHighlightsCard
          highlights={model.highlights.items}
          numberFormat={numberFormat}
          t={t}
        />
      </div>
      <TeamComparisonCard
        comparison={model.comparison}
        numberFormat={numberFormat}
        percentFormat={percentFormat}
        t={t}
      />
    </div>
  );
}

function YourPerformanceCard({
  appearance,
  numberFormat,
  t,
}: {
  readonly appearance: PlayedAppearance | null;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  return (
    <Card className="flex h-full min-w-0 flex-col" data-personal-summary="">
      <CardHeader className={SUMMARY_CARD_HEADER_CLASS}>
        <h2 className="typo-label">{t("player.matchDetail.performance")}</h2>
      </CardHeader>
      <CardContent className={`${SUMMARY_CARD_CONTENT_CLASS} flex flex-1 flex-col`}>
        {appearance ? (
          <PlayedPerformance appearance={appearance} numberFormat={numberFormat} t={t} />
        ) : (
          <p className="typo-caption m-auto max-w-prose text-pretty text-center text-muted-foreground">
            {t("player.matchDetail.performance.empty.description")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PlayedPerformance({
  appearance,
  numberFormat,
  t,
}: {
  readonly appearance: PlayedAppearance;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const positionKey = appearance.position ? providerPositionLabelKey(appearance.position) : null;
  const positionLabel = appearance.position
    ? positionKey
      ? t(positionKey)
      : appearance.position
    : t("player.position.unknown");
  const minutesLabel =
    appearance.minutesPlayed === null
      ? null
      : t("player.matchDetail.minutesPlayed", { minutes: appearance.minutesPlayed });
  const identityMeta = [positionLabel, minutesLabel].filter(
    (part): part is string => part !== null,
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar name={appearance.displayName} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="typo-body min-w-0 truncate font-semibold">{appearance.displayName}</p>
              {appearance.isMvp === true ? (
                <Badge variant="outline">
                  <StarIcon aria-hidden="true" weight="fill" />
                  {t("player.matches.mvp")}
                </Badge>
              ) : null}
            </div>
            <p className="typo-caption mt-0.5 text-pretty text-muted-foreground">
              {identityMeta.join(" · ")}
            </p>
          </div>
        </div>
        <AverageRatingRing
          className="size-20"
          label={t("player.metric.rating")}
          numberFormat={numberFormat}
          rating={appearance.rating}
        />
      </div>
      <div className="flex flex-1 items-center">
        <div className="grid w-full grid-cols-3 gap-3" role="group">
          <PerformanceStat
            label={t("player.metric.goals")}
            metric="goals"
            t={t}
            value={appearance.goals === null ? null : numberFormat.format(appearance.goals)}
          />
          <PerformanceStat
            label={t("player.metric.assists")}
            metric="assists"
            t={t}
            value={appearance.assists === null ? null : numberFormat.format(appearance.assists)}
          />
          <PerformanceStat
            label={t("player.metric.shots")}
            metric="shots"
            t={t}
            value={appearance.shots === null ? null : numberFormat.format(appearance.shots)}
          />
          <PerformanceStat
            label={t("player.metric.passesMade")}
            metric="passesMade"
            t={t}
            value={ratioLabel(appearance.passesMade, appearance.passAttempts, numberFormat)}
          />
          <PerformanceStat
            label={t("player.metric.tacklesMade")}
            metric="tacklesMade"
            t={t}
            value={ratioLabel(appearance.tacklesMade, appearance.tackleAttempts, numberFormat)}
          />
          <PerformanceStat
            label={t("player.metric.redCards")}
            metric="redCards"
            t={t}
            value={appearance.redCards === null ? null : numberFormat.format(appearance.redCards)}
          />
        </div>
      </div>
    </div>
  );
}

function PerformanceStat({
  label,
  metric,
  t,
  value,
}: {
  readonly label: string;
  readonly metric: string;
  readonly t: Translator;
  readonly value: string | null;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-center rounded-lg border border-border bg-surface px-3 py-4">
      <Stat align="center" className="min-w-0">
        <MetricStatValue emptyLabel={t("player.noData")} metric={metric} value={value} />
        <StatLabel className="text-pretty text-center">{label}</StatLabel>
      </Stat>
    </div>
  );
}

function PlayerAvatar({ name }: { readonly name: string }) {
  return (
    <Avatar className="size-11">
      <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
    </Avatar>
  );
}

function ratioLabel(
  made: number | null,
  attempts: number | null,
  numberFormat: Intl.NumberFormat,
): string | null {
  if (made === null) return null;
  if (attempts === null) return numberFormat.format(made);
  return `${numberFormat.format(made)}/${numberFormat.format(attempts)}`;
}
