"use client"

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts"
import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react"
import * as stylex from "@stylexjs/stylex"
import { applyHost, applyStyles, colors, Stat, StatLabel, StatValue, typography } from "@futrob/ui"
import type { CSSProperties } from "react"
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts"
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx"
import { formatSignedNumber } from "@/shared/presentation/stats/format-signed-number.ts"
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx"
import {
  ratingTrendVsLast,
  RATING_SCALE_MAX,
  type MatchRecordSummary,
  type RatingTrend,
} from "./player-match-view.ts"

type TrendDirection = "up" | "down" | "flat"

const TREND_STATUS_KEYS = {
  up: "player.matches.performance.improved",
  down: "player.matches.performance.declined",
  flat: "player.matches.performance.unchanged",
} as const satisfies Record<TrendDirection, ParameterlessMessageKey>

const styles = stylex.create({
  panel: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  row: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "1.5rem",
  },
  stats: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.5rem",
  },
  ring: {
    position: "relative",
    width: "7rem",
    height: "7rem",
    flexShrink: 0,
  },
  ringCompact: {
    width: "5rem",
    height: "5rem",
  },
  svg: {
    width: "100%",
    height: "100%",
    transform: "rotate(-90deg)",
  },
  track: {
    fill: "none",
    stroke: colors.muted,
  },
  progress: {
    fill: "none",
    stroke: colors.primary,
  },
  ringLabel: {
    position: "absolute",
    inset: "0.7rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  ringCaption: {
    color: colors.mutedForeground,
    lineHeight: 1.25,
  },
  trend: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.25rem",
  },
  trendUp: { color: colors.primary },
  trendDown: { color: colors.danger },
  trendFlat: { color: colors.mutedForeground },
  trendIcon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
  },
  trendCopy: {
    minWidth: 0,
  },
  trendDelta: {
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
  },
})

function trendTone(direction: TrendDirection) {
  switch (direction) {
    case "up":
      return styles.trendUp
    case "down":
      return styles.trendDown
    default:
      return styles.trendFlat
  }
}

export function PerformancePanel({
  matches,
  numberFormat,
  record,
}: {
  readonly matches: readonly PlayerRecentProviderMatchDto[]
  readonly numberFormat: Intl.NumberFormat
  readonly record: MatchRecordSummary
}) {
  const { t } = useI18n()
  const rating = record.averageRating
  if (rating === null) return null
  const trend = ratingTrendVsLast(matches)
  return (
    <div {...applyStyles(styles.panel)}>
      <div {...applyStyles(styles.row)}>
        <AverageRatingRing
          label={t("player.matches.performance.averageRating")}
          numberFormat={numberFormat}
          rating={rating}
        />
        <div {...applyStyles(styles.stats)}>
          <Stat>
            <StatValue data-metric="record-matches">{numberFormat.format(matches.length)}</StatValue>
            <StatLabel>{t("player.metric.matches")}</StatLabel>
          </Stat>
          {trend ? <RatingTrendStat numberFormat={numberFormat} trend={trend} /> : null}
        </div>
      </div>
    </div>
  )
}

export function AverageRatingRing({
  className,
  label,
  numberFormat,
  rating,
  size = "default",
  style,
}: {
  readonly className?: string
  readonly label: string
  readonly numberFormat: Intl.NumberFormat
  readonly rating: number | null
  readonly size?: "default" | "compact"
  readonly style?: CSSProperties
}) {
  const { t } = useI18n()
  const progress = rating === null ? 0 : Math.min(1, Math.max(0, rating / RATING_SCALE_MAX)) * 100

  return (
    <div
      aria-label={rating === null ? label : `${label} ${numberFormat.format(rating)}`}
      data-rating-ring=""
      role="img"
      {...applyHost(className, style, styles.ring, size === "compact" && styles.ringCompact)}
    >
      <svg aria-hidden="true" viewBox="0 0 36 36" {...applyStyles(styles.svg)}>
        <circle
          cx="18"
          cy="18"
          pathLength="100"
          r="15.915"
          strokeWidth="2.5"
          {...applyStyles(styles.track)}
        />
        <circle
          cx="18"
          cy="18"
          data-rating-progress={String(Math.round(progress))}
          pathLength="100"
          r="15.915"
          strokeDasharray={`${progress} 100`}
          strokeLinecap="round"
          strokeWidth="2.5"
          {...applyStyles(styles.progress)}
        />
      </svg>
      <div {...applyStyles(styles.ringLabel)}>
        <MetricStatValue
          emptyLabel={t("player.noData")}
          metric="record-rating"
          value={rating === null ? null : numberFormat.format(rating)}
        />
        <p {...applyStyles(typography.caption, styles.ringCaption)}>{label}</p>
      </div>
    </div>
  )
}

function RatingTrendStat({
  numberFormat,
  trend,
}: {
  readonly numberFormat: Intl.NumberFormat
  readonly trend: RatingTrend
}) {
  const { t } = useI18n()
  const direction = trendDirection(trend.delta)
  const TrendIcon = direction === "down" ? TrendDownIcon : TrendUpIcon
  const statusLabel = t(TREND_STATUS_KEYS[direction])

  return (
    <p
      aria-label={t("player.matches.performance.trendAria", {
        status: statusLabel,
        delta: formatSignedNumber(trend.delta, numberFormat),
        count: trend.window,
      })}
      data-rating-trend={direction}
      {...applyStyles(styles.trend, trendTone(direction))}
    >
      {direction === "flat" ? null : (
        <TrendIcon aria-hidden="true" {...applyStyles(styles.trendIcon)} />
      )}
      <span {...applyStyles(typography.caption, styles.trendCopy)}>
        <span {...applyStyles(styles.trendDelta)}>
          {formatSignedNumber(trend.delta, numberFormat)}
        </span>{" "}
        {t("player.matches.performance.vsLast", { count: trend.window })}
      </span>
    </p>
  )
}

function trendDirection(delta: number): TrendDirection {
  if (delta > 0.005) return "up"
  if (delta < -0.005) return "down"
  return "flat"
}
