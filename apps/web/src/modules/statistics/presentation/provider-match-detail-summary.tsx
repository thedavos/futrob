"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Stat,
  StatLabel,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
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
  summaryCard,
  summaryCardContent,
  summaryCardHeader,
} from "./provider-match-detail-summary-highlights.tsx";

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  grid: {
    display: "grid",
    alignItems: "stretch",
    gap: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(2, minmax(0, 1fr))",
    },
  },
  empty: {
    margin: "auto",
    maxWidth: "65ch",
    textAlign: "center",
    color: colors.mutedForeground,
  },
  played: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: "1.25rem",
  },
  identityRow: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "1rem",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  identityCopy: {
    minWidth: 0,
  },
  nameRow: {
    display: "flex",
    minWidth: 0,
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  name: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  meta: {
    marginTop: "0.125rem",
    color: colors.mutedForeground,
  },
  metrics: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "0.75rem",
  },
  metric: {
    display: "flex",
    height: "100%",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "0.75rem",
    paddingBlock: "1rem",
  },
  metricStat: {
    minWidth: 0,
  },
  metricLabel: {
    textAlign: "center",
  },
  avatar: {
    width: "2.75rem",
    height: "2.75rem",
  },
});

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
    <div {...applyStyles(styles.stack)}>
      <div {...applyStyles(styles.grid)}>
        <YourPerformanceCard
          appearance={model.appearance}
          numberFormat={numberFormat}
          percentFormat={percentFormat}
          t={t}
        />
        <MatchHighlightsCard
          highlights={model.highlights.items}
          numberFormat={numberFormat}
          percentFormat={percentFormat}
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
  percentFormat,
  t,
}: {
  readonly appearance: PlayedAppearance | null;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const card = applyStyles(summaryCard);
  const header = applyStyles(summaryCardHeader);
  const content = applyStyles(summaryCardContent);
  return (
    <Card className={card.className} data-personal-summary="" style={card.style}>
      <CardHeader className={header.className} style={header.style}>
        <h2 {...applyStyles(typography.label)}>{t("player.matchDetail.performance")}</h2>
      </CardHeader>
      <CardContent className={content.className} style={content.style}>
        {appearance ? (
          <PlayedPerformance
            appearance={appearance}
            numberFormat={numberFormat}
            percentFormat={percentFormat}
            t={t}
          />
        ) : (
          <p {...applyStyles(typography.caption, styles.empty)}>
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
  percentFormat,
  t,
}: {
  readonly appearance: PlayedAppearance;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
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
    <div {...applyStyles(styles.played)}>
      <div {...applyStyles(styles.identityRow)}>
        <div {...applyStyles(styles.identity)}>
          <PlayerAvatar name={appearance.displayName} />
          <div {...applyStyles(styles.identityCopy)}>
            <div {...applyStyles(styles.nameRow)}>
              <p {...applyStyles(typography.body, styles.name)}>{appearance.displayName}</p>
              {appearance.isMvp === true ? (
                <Badge variant="outline">
                  <StarIcon aria-hidden="true" weight="fill" />
                  {t("player.matches.mvp")}
                </Badge>
              ) : null}
            </div>
            <p {...applyStyles(typography.caption, styles.meta)}>{identityMeta.join(" · ")}</p>
          </div>
        </div>
        <AverageRatingRing
          label={t("player.metric.rating")}
          numberFormat={numberFormat}
          rating={appearance.rating}
          size="compact"
        />
      </div>
      <div role="group" {...applyStyles(styles.metrics)}>
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
          label={t("player.matchDetail.performance.passAccuracy")}
          metric="passesMade"
          t={t}
          value={accuracyPercent(appearance.passesMade, appearance.passAttempts, percentFormat)}
        />
        <PerformanceStat
          label={t("player.matchDetail.performance.tackleAccuracy")}
          metric="tacklesMade"
          t={t}
          value={accuracyPercent(appearance.tacklesMade, appearance.tackleAttempts, percentFormat)}
        />
        <PerformanceStat
          label={t("player.metric.redCards")}
          metric="redCards"
          t={t}
          value={appearance.redCards === null ? null : numberFormat.format(appearance.redCards)}
        />
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
  const metricStat = applyStyles(styles.metricStat);
  const metricLabel = applyStyles(styles.metricLabel);
  return (
    <div {...applyStyles(styles.metric)}>
      <Stat align="center" className={metricStat.className} style={metricStat.style}>
        <MetricStatValue emptyLabel={t("player.noData")} metric={metric} value={value} />
        <StatLabel className={metricLabel.className} style={metricLabel.style}>
          {label}
        </StatLabel>
      </Stat>
    </div>
  );
}

function PlayerAvatar({ name }: { readonly name: string }) {
  return (
    <Avatar {...applyStyles(styles.avatar)}>
      <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
    </Avatar>
  );
}

function accuracyPercent(
  made: number | null,
  attempts: number | null,
  percentFormat: Intl.NumberFormat,
): string | null {
  if (made === null || attempts === null || attempts === 0) return null;
  return percentFormat.format(made / attempts);
}
