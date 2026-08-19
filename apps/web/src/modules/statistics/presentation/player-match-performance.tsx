"use client";

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { Stat, StatLabel, StatValue } from "@futrob/ui";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { formatSignedNumber } from "@/shared/presentation/stats/format-signed-number.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import {
  ratingTrendVsLast,
  RATING_SCALE_MAX,
  type MatchRecordSummary,
  type RatingTrend,
} from "./player-match-view.ts";

type TrendDirection = "up" | "down" | "flat";

const TREND_TONE_CLASS = {
  up: "text-primary",
  down: "text-danger",
  flat: "text-muted-foreground",
} as const satisfies Record<TrendDirection, string>;

const TREND_STATUS_KEYS = {
  up: "player.matches.performance.improved",
  down: "player.matches.performance.declined",
  flat: "player.matches.performance.unchanged",
} as const satisfies Record<TrendDirection, ParameterlessMessageKey>;

export function PerformancePanel({
  matches,
  numberFormat,
  record,
}: {
  readonly matches: readonly PlayerRecentProviderMatchDto[];
  readonly numberFormat: Intl.NumberFormat;
  readonly record: MatchRecordSummary;
}) {
  const { t } = useI18n();
  const rating = record.averageRating;
  if (rating === null) return null;
  const trend = ratingTrendVsLast(matches);
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center items-start">
      <div className="flex min-w-0 items-center gap-6">
        <AverageRatingRing numberFormat={numberFormat} rating={rating} />
        <div className="flex min-w-0 flex-col gap-2">
          <Stat>
            <StatValue data-metric="record-matches">
              {numberFormat.format(matches.length)}
            </StatValue>
            <StatLabel>{t("player.metric.matches")}</StatLabel>
          </Stat>
          {trend ? <RatingTrendStat numberFormat={numberFormat} trend={trend} /> : null}
        </div>
      </div>
    </div>
  );
}

export function AverageRatingRing({
  numberFormat,
  rating,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly rating: number | null;
}) {
  const { t } = useI18n();
  const progress = rating === null ? 0 : Math.min(1, Math.max(0, rating / RATING_SCALE_MAX)) * 100;
  const label = t("player.matches.performance.averageRating");

  return (
    <div
      aria-label={rating === null ? label : `${label} ${numberFormat.format(rating)}`}
      className="relative size-28 shrink-0"
      data-rating-ring=""
      role="img"
    >
      <svg aria-hidden="true" className="size-full -rotate-90" viewBox="0 0 36 36">
        <circle
          className="fill-none stroke-muted"
          cx="18"
          cy="18"
          pathLength="100"
          r="15.915"
          strokeWidth="2.5"
        />
        <circle
          className="fill-none stroke-primary"
          cx="18"
          cy="18"
          data-rating-progress={String(Math.round(progress))}
          pathLength="100"
          r="15.915"
          strokeDasharray={`${progress} 100`}
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
      <div className="absolute inset-[0.7rem] flex flex-col items-center justify-center text-center">
        <MetricStatValue
          emptyLabel={t("player.noData")}
          metric="record-rating"
          value={rating === null ? null : numberFormat.format(rating)}
        />
        <p className="typo-caption text-pretty leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function RatingTrendStat({
  numberFormat,
  trend,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly trend: RatingTrend;
}) {
  const { t } = useI18n();
  const direction = trendDirection(trend.delta);
  const TrendIcon = direction === "down" ? TrendDownIcon : TrendUpIcon;
  const statusLabel = t(TREND_STATUS_KEYS[direction]);

  return (
    <p
      aria-label={t("player.matches.performance.trendAria", {
        status: statusLabel,
        delta: formatSignedNumber(trend.delta, numberFormat),
        count: trend.window,
      })}
      className={`flex min-w-0 items-center gap-1 ${TREND_TONE_CLASS[direction]}`}
      data-rating-trend={direction}
    >
      {direction === "flat" ? null : <TrendIcon aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className="typo-caption min-w-0 text-pretty">
        <span className="font-medium tabular-nums">
          {formatSignedNumber(trend.delta, numberFormat)}
        </span>{" "}
        {t("player.matches.performance.vsLast", { count: trend.window })}
      </span>
    </p>
  );
}

function trendDirection(delta: number): TrendDirection {
  if (delta > 0.005) return "up";
  if (delta < -0.005) return "down";
  return "flat";
}
