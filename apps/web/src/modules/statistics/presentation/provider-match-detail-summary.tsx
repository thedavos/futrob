"use client";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
} from "@futrob/ui";
import { StarIcon } from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { AverageRatingRing } from "./player-match-performance.tsx";
import {
  comparisonBarShares,
  providerPositionLabelKey,
  TEAM_COMPARISON_METRICS,
  type MatchHighlight,
  type MatchHighlightKind,
  type PlayedAppearance,
  type ProviderMatchDetailModel,
  type TeamComparisonMetric,
  type TeamComparisonModel,
  type TeamStatValue,
} from "./provider-match-detail-model.ts";

const HIGHLIGHT_TITLE_KEYS = {
  mvp: "player.matchDetail.highlights.mvp",
  scorer: "player.matchDetail.highlights.scorer",
  rival: "player.matchDetail.highlights.rival",
} as const satisfies Record<MatchHighlightKind, ParameterlessMessageKey>;

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
      <div className="grid gap-6 lg:grid-cols-2">
        <TeamComparisonCard
          comparison={model.comparison}
          numberFormat={numberFormat}
          percentFormat={percentFormat}
          t={t}
        />
        <YourPerformanceCard appearance={model.appearance} numberFormat={numberFormat} t={t} />
      </div>
      <MatchHighlightsCard highlights={model.highlights.items} numberFormat={numberFormat} t={t} />
    </div>
  );
}

function TeamComparisonCard({
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
    <Card data-team-comparison="">
      <CardHeader className="px-5 py-4">
        <h2 className="typo-subtitle font-semibold">{t("player.matchDetail.comparison")}</h2>
        <div className="flex min-w-0 items-center justify-between gap-3 pt-1">
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
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${side === "opponent" ? "flex-row-reverse" : ""}`}
      data-comparison-club={side}
    >
      <ClubCrestAvatar
        className="size-7 shrink-0"
        framed={false}
        imageUrl={team.imageUrl}
        name={team.name}
      />
      <p className="typo-caption min-w-0 truncate font-medium">{team.name}</p>
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
  return (
    <li
      aria-label={`${label}: ${formatStatValue(selected, metric, numberFormat, percentFormat, t)} ${formatStatValue(opponent, metric, numberFormat, percentFormat, t)}`}
      className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto_minmax(0,1fr)_2.75rem] items-center gap-x-2"
      data-comparison-metric={metric.key}
    >
      <p className="typo-caption truncate text-end tabular-nums font-semibold">
        {formatStatValue(selected, metric, numberFormat, percentFormat, t)}
      </p>
      <ComparisonBar fill="primary" percent={shares.selected} side="selected" />
      <p className="typo-caption px-1 text-center text-muted-foreground">{label}</p>
      <ComparisonBar fill="muted" percent={shares.opponent} side="opponent" />
      <p className="typo-caption truncate tabular-nums font-semibold">
        {formatStatValue(opponent, metric, numberFormat, percentFormat, t)}
      </p>
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
        className={`h-full rounded-full ${fill === "primary" ? "bg-primary" : "bg-muted-foreground/45"} ${side === "selected" ? "ml-auto" : ""}`}
        data-comparison-fill={String(Math.round(percent))}
        style={{ width: `${percent}%` }}
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
    <Card data-personal-summary="">
      <CardHeader className="px-5 py-4">
        <h2 className="typo-subtitle font-semibold">{t("player.matchDetail.performance")}</h2>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {appearance ? (
          <PlayedPerformance appearance={appearance} numberFormat={numberFormat} t={t} />
        ) : (
          <p className="typo-caption text-muted-foreground">
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
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <PlayerAvatar name={appearance.displayName} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="typo-subtitle min-w-0 truncate font-semibold">
                {appearance.displayName}
              </p>
              {appearance.isMvp === true ? (
                <Badge variant="outline">
                  <StarIcon aria-hidden="true" weight="fill" />
                  {t("player.matches.mvp")}
                </Badge>
              ) : null}
            </div>
            <p className="typo-caption mt-0.5 text-muted-foreground">{positionLabel}</p>
            <p className="typo-caption mt-0.5 text-muted-foreground">
              {appearance.minutesPlayed === null
                ? t("player.noData")
                : t("player.matchDetail.minutesPlayed", { minutes: appearance.minutesPlayed })}
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
      <StatGroup className="gap-x-6 gap-y-4">
        <PerformanceStat
          label={t("player.metric.goals")}
          metric="goals"
          numberFormat={numberFormat}
          t={t}
          value={appearance.goals}
        />
        <PerformanceStat
          label={t("player.metric.assists")}
          metric="assists"
          numberFormat={numberFormat}
          t={t}
          value={appearance.assists}
        />
        <PerformanceStat
          label={t("player.metric.shots")}
          metric="shots"
          numberFormat={numberFormat}
          t={t}
          value={appearance.shots}
        />
        <Stat>
          <MetricStatValue
            emptyLabel={t("player.noData")}
            metric="passesMade"
            value={ratioLabel(appearance.passesMade, appearance.passAttempts, numberFormat)}
          />
          <StatLabel>{t("player.metric.passesMade")}</StatLabel>
        </Stat>
        <Stat>
          <MetricStatValue
            emptyLabel={t("player.noData")}
            metric="tacklesMade"
            value={ratioLabel(appearance.tacklesMade, appearance.tackleAttempts, numberFormat)}
          />
          <StatLabel>{t("player.metric.tacklesMade")}</StatLabel>
        </Stat>
        <PerformanceStat
          label={t("player.metric.redCards")}
          metric="redCards"
          numberFormat={numberFormat}
          t={t}
          value={appearance.redCards}
        />
      </StatGroup>
    </div>
  );
}

function PerformanceStat({
  label,
  metric,
  numberFormat,
  t,
  value,
}: {
  readonly label: string;
  readonly metric: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
  readonly value: number | null;
}) {
  return (
    <Stat>
      <MetricStatValue
        emptyLabel={t("player.noData")}
        metric={metric}
        value={value === null ? null : numberFormat.format(value)}
      />
      <StatLabel>{label}</StatLabel>
    </Stat>
  );
}

function MatchHighlightsCard({
  highlights,
  numberFormat,
  t,
}: {
  readonly highlights: readonly MatchHighlight[];
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  return (
    <Card data-match-highlights="">
      <CardHeader className="px-5 py-4">
        <h2 className="typo-subtitle font-semibold">{t("player.matchDetail.highlights")}</h2>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {highlights.length === 0 ? (
          <p className="typo-caption text-muted-foreground">
            {t("player.matchDetail.highlights.empty")}
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-3">
            {highlights.map((item) => (
              <HighlightItem
                item={item}
                key={`${item.kind}:${item.player.externalPlayerId}`}
                numberFormat={numberFormat}
                t={t}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HighlightItem({
  item,
  numberFormat,
  t,
}: {
  readonly item: MatchHighlight;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const primary = highlightPrimary(item, numberFormat, t);
  const secondary = highlightSecondary(item, numberFormat, t);
  return (
    <li className="flex min-w-0 flex-col gap-3" data-highlight={item.kind}>
      <p className="typo-label text-muted-foreground">{t(HIGHLIGHT_TITLE_KEYS[item.kind])}</p>
      <div className="flex min-w-0 items-center gap-3">
        <PlayerAvatar name={item.player.displayName} />
        <p className="typo-subtitle min-w-0 truncate font-semibold">{item.player.displayName}</p>
      </div>
      <Stat>
        <StatValue size="compact">{primary.value}</StatValue>
        <StatLabel>{primary.label}</StatLabel>
      </Stat>
      {secondary ? <p className="typo-caption text-muted-foreground">{secondary}</p> : null}
    </li>
  );
}

function PlayerAvatar({ name }: { readonly name: string }) {
  return (
    <Avatar className="size-11">
      <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
    </Avatar>
  );
}

interface HighlightPrimary {
  readonly label: string;
  readonly value: string;
}

function highlightPrimary(
  item: MatchHighlight,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): HighlightPrimary {
  switch (item.kind) {
    case "mvp":
    case "rival": {
      const primary: HighlightPrimary = {
        label: t("player.metric.rating"),
        value: formatOptionalNumber(item.rating, numberFormat, t),
      };
      return primary;
    }
    case "scorer": {
      const primary: HighlightPrimary = {
        label: t("player.metric.goals"),
        value: formatOptionalNumber(item.goals, numberFormat, t),
      };
      return primary;
    }
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

function highlightSecondary(
  item: MatchHighlight,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string | null {
  switch (item.kind) {
    case "mvp":
      return joinHighlightLines([
        item.assists === null
          ? null
          : t("player.matchDetail.highlights.assists", { count: item.assists }),
        passLine(item.passesMade, item.passAttempts, numberFormat, t),
      ]);
    case "scorer":
      return joinHighlightLines([
        item.shots === null
          ? null
          : t("player.matchDetail.highlights.shots", { count: item.shots }),
        item.rating === null
          ? null
          : t("player.matchDetail.highlights.rating", {
              rating: numberFormat.format(item.rating),
            }),
      ]);
    case "rival":
      return joinHighlightLines([
        passLine(item.passesMade, item.passAttempts, numberFormat, t),
        item.tacklesMade === null
          ? null
          : t("player.matchDetail.highlights.tackles", { count: item.tacklesMade }),
      ]);
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

function passLine(
  made: number | null,
  attempts: number | null,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string | null {
  if (made === null || attempts === null) return null;
  return t("player.matchDetail.highlights.passes", {
    made: numberFormat.format(made),
    attempts: numberFormat.format(attempts),
  });
}

function joinHighlightLines(parts: readonly (string | null)[]): string | null {
  const lines = parts.filter((part): part is string => part !== null);
  return lines.length === 0 ? null : lines.join(" · ");
}

function formatOptionalNumber(
  value: number | null,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string {
  return value === null ? t("player.noData") : numberFormat.format(value);
}

function formatStatValue(
  value: TeamStatValue,
  metric: TeamComparisonMetric,
  numberFormat: Intl.NumberFormat,
  percentFormat: Intl.NumberFormat,
  t: Translator,
): string {
  if (value.kind === "unknown") return t("player.noData");
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

function ratioLabel(
  made: number | null,
  attempts: number | null,
  numberFormat: Intl.NumberFormat,
): string | null {
  if (made === null) return null;
  if (attempts === null) return numberFormat.format(made);
  return `${numberFormat.format(made)}/${numberFormat.format(attempts)}`;
}
