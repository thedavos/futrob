"use client";

import { Card, CardContent, CardHeader } from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  comparisonBarShares,
  TEAM_COMPARISON_METRICS,
  type TeamComparisonMetric,
  type TeamComparisonModel,
  type TeamStatValue,
} from "./provider-match-detail-model.ts";

const COMPARISON_CARD_HEADER_CLASS = "flex flex-col gap-6 space-y-0 px-5 pt-5 pb-4";
const COMPARISON_ROW_CLASS = "grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] gap-x-3";

export function TeamComparisonCard({
  comparison,
  numberFormat,
  percentFormat,
  t,
}: {
  readonly comparison: TeamComparisonModel;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  return (
    <Card className="min-w-0" data-team-comparison="">
      <CardHeader className={COMPARISON_CARD_HEADER_CLASS}>
        <h2 className="typo-label">{t("player.matchDetail.comparison")}</h2>
        <div className="grid grid-cols-2 items-center gap-3">
          <ComparisonClubSide side="selected" team={comparison.selected.team} />
          <ComparisonClubSide side="opponent" team={comparison.opponent.team} />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <ul className="flex flex-col gap-3">
          {TEAM_COMPARISON_METRICS.map((metric) => (
            <ComparisonMetricRow
              key={metric.key}
              metric={metric}
              numberFormat={numberFormat}
              opponent={comparison.opponent.stats[metric.key]}
              percentFormat={percentFormat}
              selected={comparison.selected.stats[metric.key]}
              t={t}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ComparisonClubSide({
  side,
  team,
}: {
  readonly side: "selected" | "opponent";
  readonly team: TeamComparisonModel["selected"]["team"];
}) {
  const isOpponent = side === "opponent";
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${isOpponent ? "justify-end" : ""}`}
      data-comparison-club={side}
    >
      {isOpponent ? null : (
        <ClubCrestAvatar
          className="size-8 shrink-0"
          framed={false}
          imageUrl={team.imageUrl}
          name={team.name}
        />
      )}
      <p className={`typo-body min-w-0 truncate ${isOpponent ? "text-end" : ""}`}>{team.name}</p>
      {isOpponent ? (
        <ClubCrestAvatar
          className="size-8 shrink-0"
          framed={false}
          imageUrl={team.imageUrl}
          name={team.name}
        />
      ) : null}
    </div>
  );
}

function ComparisonMetricRow({
  metric,
  numberFormat,
  opponent,
  percentFormat,
  selected,
  t,
}: {
  readonly metric: TeamComparisonMetric;
  readonly numberFormat: Intl.NumberFormat;
  readonly opponent: TeamStatValue;
  readonly percentFormat: Intl.NumberFormat;
  readonly selected: TeamStatValue;
  readonly t: Translator;
}) {
  const shares = comparisonBarShares(selected, opponent);
  const label = t(metric.labelKey);
  const selectedLabel = formatStatValue(selected, metric, numberFormat, percentFormat);
  const opponentLabel = formatStatValue(opponent, metric, numberFormat, percentFormat);
  return (
    <li
      aria-label={`${label}: ${statValueSpoken(selected, metric, numberFormat, percentFormat, t)} ${statValueSpoken(opponent, metric, numberFormat, percentFormat, t)}`}
      className={`${COMPARISON_ROW_CLASS} grid-rows-[auto_auto] items-center gap-y-1`}
      data-comparison-metric={metric.key}
    >
      <p className="typo-label col-span-3 text-center text-pretty text-muted-foreground">{label}</p>
      <p className="typo-caption text-end whitespace-nowrap tabular-nums font-semibold">
        {selectedLabel}
      </p>
      <div className="grid grid-cols-2 items-center gap-1">
        <ComparisonBar fill="primary" percent={shares.selected} side="selected" />
        <ComparisonBar fill="muted" percent={shares.opponent} side="opponent" />
      </div>
      <p className="typo-caption whitespace-nowrap tabular-nums font-semibold">{opponentLabel}</p>
    </li>
  );
}

function ComparisonBar({
  fill,
  percent,
  side,
}: {
  readonly fill: "primary" | "muted";
  readonly percent: number;
  readonly side: "selected" | "opponent";
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" data-comparison-bar={side}>
      <div
        className={`h-full rounded-full ${fill === "primary" ? "bg-primary" : "bg-muted-foreground/45"} ${side === "selected" ? "ms-auto" : ""}`}
        data-comparison-fill={String(Math.round(percent))}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function formatStatValue(
  value: TeamStatValue,
  metric: TeamComparisonMetric,
  numberFormat: Intl.NumberFormat,
  percentFormat: Intl.NumberFormat,
): string {
  if (value.kind === "unknown") return "—";
  switch (metric.format) {
    case "count":
      return numberFormat.format(value.value);
    case "percent":
      return percentFormat.format(value.value);
    default: {
      const _exhaustive: never = metric.format;
      return _exhaustive;
    }
  }
}

function statValueSpoken(
  value: TeamStatValue,
  metric: TeamComparisonMetric,
  numberFormat: Intl.NumberFormat,
  percentFormat: Intl.NumberFormat,
  t: Translator,
): string {
  if (value.kind === "unknown") return t("player.noData");
  return formatStatValue(value, metric, numberFormat, percentFormat);
}
