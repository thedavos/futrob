"use client";

import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles, Card, CardContent, CardHeader, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  comparisonBarShares,
  TEAM_COMPARISON_METRICS,
  type TeamComparisonMetric,
  type TeamComparisonModel,
  type TeamStatValue,
} from "./provider-match-detail-model.ts";

const styles = stylex.create({
  card: {
    minWidth: 0,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    paddingInline: "1.25rem",
    paddingTop: "1.25rem",
    paddingBottom: "1rem",
  },
  clubs: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    alignItems: "center",
    gap: "0.75rem",
  },
  content: {
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  club: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  clubEnd: {
    justifyContent: "flex-end",
  },
  clubName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  clubNameEnd: {
    textAlign: "end",
  },
  crest: {
    width: "2rem",
    height: "2rem",
    flexShrink: 0,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "3.5rem minmax(0, 1fr) 3.5rem",
    gridTemplateRows: "auto auto",
    columnGap: "0.75rem",
    rowGap: "0.25rem",
    alignItems: "center",
  },
  metricLabel: {
    gridColumn: "span 3",
    textAlign: "center",
    color: colors.mutedForeground,
  },
  selectedValue: {
    textAlign: "end",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
  },
  bars: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    alignItems: "center",
    gap: "0.25rem",
  },
  opponentValue: {
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
  },
  bar: {
    height: "0.375rem",
    overflow: "hidden",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.muted,
  },
  fill: {
    height: "100%",
    borderRadius: "var(--corner-full)",
  },
  fillPrimary: {
    backgroundColor: colors.primary,
  },
  fillMuted: {
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 45%, transparent)",
  },
  fillEnd: {
    marginInlineStart: "auto",
  },
});

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
    <Card className={styles.card} data-team-comparison="">
      <CardHeader className={styles.header}>
        <h2 {...applyStyles(typography.label)}>{t("player.matchDetail.comparison")}</h2>
        <div {...applyStyles(styles.clubs)}>
          <ComparisonClubSide side="selected" team={comparison.selected.team} />
          <ComparisonClubSide side="opponent" team={comparison.opponent.team} />
        </div>
      </CardHeader>
      <CardContent className={styles.content}>
        <ul {...applyStyles(styles.list)}>
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
  const crest = applyStyles(styles.crest);
  return (
    <div data-comparison-club={side} {...applyStyles(styles.club, isOpponent && styles.clubEnd)}>
      {isOpponent ? null : (
        <ClubCrestAvatar
          className={crest.className}
          framed={false}
          imageUrl={team.imageUrl}
          name={team.name}
          style={crest.style}
        />
      )}
      <p {...applyStyles(typography.body, styles.clubName, isOpponent && styles.clubNameEnd)}>
        {team.name}
      </p>
      {isOpponent ? (
        <ClubCrestAvatar
          className={crest.className}
          framed={false}
          imageUrl={team.imageUrl}
          name={team.name}
          style={crest.style}
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
      data-comparison-metric={metric.key}
      {...applyStyles(styles.row)}
    >
      <p {...applyStyles(typography.label, styles.metricLabel)}>{label}</p>
      <p {...applyStyles(typography.caption, styles.selectedValue)}>{selectedLabel}</p>
      <div {...applyStyles(styles.bars)}>
        <ComparisonBar fill="primary" percent={shares.selected} side="selected" />
        <ComparisonBar fill="muted" percent={shares.opponent} side="opponent" />
      </div>
      <p {...applyStyles(typography.caption, styles.opponentValue)}>{opponentLabel}</p>
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
    <div data-comparison-bar={side} {...applyStyles(styles.bar)}>
      <div
        data-comparison-fill={String(Math.round(percent))}
        {...applyProps(
          undefined,
          { width: `${percent}%` },
          styles.fill,
          fill === "primary" ? styles.fillPrimary : styles.fillMuted,
          side === "selected" && styles.fillEnd,
        )}
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
