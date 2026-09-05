"use client";

import { useId } from "react";
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
import { StarIcon } from "@phosphor-icons/react";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { providerPositionLabelKey, type PlayedAppearance } from "./provider-match-detail-model.ts";
import { ratingTone, ratioLabel, type RatingTone } from "./provider-match-detail-roster-view.ts";
import { styles } from "./provider-match-detail-summary-performance.styles.ts";

export function YourPerformanceSection({
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
  const headingId = useId();
  return (
    <section data-personal-summary="" {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(typography.label)}>
        {t("player.matchDetail.performance")}
      </h2>
      <PlayedPerformance
        appearance={appearance}
        headingId={headingId}
        numberFormat={numberFormat}
        percentFormat={percentFormat}
        t={t}
      />
    </section>
  );
}

function PlayedPerformance({
  appearance,
  headingId,
  numberFormat,
  percentFormat,
  t,
}: {
  readonly appearance: PlayedAppearance;
  readonly headingId: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const metrics = performanceMetrics(appearance, numberFormat, percentFormat, t);
  return (
    <Card aria-labelledby={headingId} className={styles.card}>
      <CardHeader className={styles.header}>
        <PerformanceIdentityItem appearance={appearance} numberFormat={numberFormat} t={t} />
      </CardHeader>
      <CardContent className={styles.content}>
        <ul {...applyStyles(styles.list)}>
          {metrics.map((item) => (
            <PerformanceStatItem item={item} key={item.metric} t={t} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PerformanceIdentityItem({
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
  const ratingLabel = t("player.metric.rating");
  const tone = ratingTone(appearance.rating);
  return (
    <div
      data-performance-item="rating"
      data-rating-tone={tone}
      {...applyStyles(styles.identityItem)}
    >
      <div {...applyStyles(styles.identityHeader)}>
        <div {...applyStyles(styles.itemCopy)}>
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
              {identityMeta.length > 0 ? (
                <p {...applyStyles(typography.caption, styles.secondary)}>
                  {identityMeta.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Stat align="end" className={styles.stat}>
          <MetricStatValue
            className={ratingValueStyle(tone)}
            emptyLabel={t("player.noData")}
            metric="rating"
            value={appearance.rating === null ? null : numberFormat.format(appearance.rating)}
          />
          <StatLabel className={styles.pretty}>{ratingLabel}</StatLabel>
        </Stat>
      </div>
    </div>
  );
}

function ratingValueStyle(tone: RatingTone) {
  switch (tone) {
    case "normal":
      return undefined;
    case "good":
      return styles.ratingGood;
    case "excellent":
      return styles.ratingExcellent;
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

interface PerformanceMetricItem {
  readonly label: string;
  readonly metric: string;
  readonly value: string | null;
}

function performanceMetrics(
  appearance: PlayedAppearance,
  numberFormat: Intl.NumberFormat,
  percentFormat: Intl.NumberFormat,
  t: Translator,
): readonly PerformanceMetricItem[] {
  return [
    {
      metric: "goals",
      label: t("player.metric.goals"),
      value: appearance.goals === null ? null : numberFormat.format(appearance.goals),
    },
    {
      metric: "assists",
      label: t("player.metric.assists"),
      value: appearance.assists === null ? null : numberFormat.format(appearance.assists),
    },
    {
      metric: "shots",
      label: t("player.metric.shots"),
      value: appearance.shots === null ? null : numberFormat.format(appearance.shots),
    },
    {
      metric: "passAccuracy",
      label: t("player.matchDetail.performance.passAccuracy"),
      value: accuracyPercent(appearance.passesMade, appearance.passAttempts, percentFormat),
    },
    {
      metric: "tackleAccuracy",
      label: t("player.matchDetail.performance.tackleAccuracy"),
      value: accuracyPercent(appearance.tacklesMade, appearance.tackleAttempts, percentFormat),
    },
    {
      metric: "redCards",
      label: t("player.metric.redCards"),
      value: appearance.redCards === null ? null : numberFormat.format(appearance.redCards),
    },
    {
      metric: "yellowCards",
      label: t("player.metric.yellowCards"),
      value: appearance.yellowCards === null ? null : numberFormat.format(appearance.yellowCards),
    },
    {
      metric: "passesMade",
      label: t("player.metric.passesMade"),
      value: madeAttemptsRatio(appearance.passesMade, appearance.passAttempts, numberFormat),
    },
    {
      metric: "tacklesMade",
      label: t("player.metric.tacklesMade"),
      value: madeAttemptsRatio(appearance.tacklesMade, appearance.tackleAttempts, numberFormat),
    },
  ];
}

function PerformanceStatItem({
  item,
  t,
}: {
  readonly item: PerformanceMetricItem;
  readonly t: Translator;
}) {
  return (
    <li data-performance-item={item.metric} {...applyStyles(styles.item)}>
      <Stat align="center">
        <StatLabel className={styles.metricLabel}>{item.label}</StatLabel>
        <MetricStatValue
          className={item.value === null ? undefined : styles.metricValue}
          emptyLabel={t("player.noData")}
          metric={item.metric}
          value={item.value}
        />
      </Stat>
    </li>
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

function madeAttemptsRatio(
  made: number | null,
  attempts: number | null,
  numberFormat: Intl.NumberFormat,
): string | null {
  if (made === null || attempts === null) return null;
  return ratioLabel(made, attempts, numberFormat);
}
