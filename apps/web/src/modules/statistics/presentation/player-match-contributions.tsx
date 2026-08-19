"use client";

import { ChartLineUpIcon } from "@phosphor-icons/react";
import { Stat, StatGroup, StatLabel } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import { STAT_TRIPLE_GRID_CLASS_NAME } from "@/shared/presentation/stats/summary-card.tsx";
import { TooltipStat } from "@/shared/presentation/stats/tooltip-stat.tsx";
import type {
  ContributionPace,
  ContributedRatio,
  MatchRecordSummary,
  TeamGoalShare,
} from "./player-match-view.ts";

export function ContributionsHero({
  numberFormat,
  record,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly record: MatchRecordSummary;
}) {
  const { t } = useI18n();
  const composition = contributionCompositionCopy(record.goals, record.assists, t);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Stat className="flex-row items-baseline gap-1.5">
        <MetricStatValue
          emptyLabel={t("player.noData")}
          metric="record-goals-plus-assists"
          value={
            record.goalsPlusAssists === null ? null : numberFormat.format(record.goalsPlusAssists)
          }
        />
        <StatLabel className="flex items-center gap-1">
          <ChartLineUpIcon
            aria-hidden="true"
            className="size-3.5"
            data-metric-icon="record-goals-plus-assists"
            weight="regular"
          />
          {t("player.metric.goalsPlusAssists")}
        </StatLabel>
      </Stat>
      {composition ? (
        <p
          className="typo-caption text-pretty text-muted-foreground"
          data-contribution-composition=""
        >
          {composition}
        </p>
      ) : null}
    </div>
  );
}

export function ContributionInsights({
  numberFormat,
  record,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly record: MatchRecordSummary;
}) {
  const { t } = useI18n();
  const contributed = contributedRatioView(record.contributions.contributed, numberFormat, t);
  const pace = contributionPaceView(record.contributions.pace, numberFormat, t);
  const share = contributionShareView(record.contributions.teamGoalShare, numberFormat, t);

  return (
    <StatGroup className={`${STAT_TRIPLE_GRID_CLASS_NAME} [&>*]:min-w-0`}>
      <TooltipStat
        label={t("player.matches.contributions.contributed")}
        tooltip={contributed.tooltip}
      >
        <MetricStatValue
          emptyLabel={t("player.noData")}
          metric="record-contributed"
          value={contributed.value}
        />
      </TooltipStat>
      <TooltipStat label={t("player.matches.contributions.pace")} tooltip={pace.tooltip}>
        <MetricStatValue emptyLabel={t("player.noData")} metric="record-pace" value={pace.value} />
      </TooltipStat>
      <TooltipStat label={t("player.matches.contributions.share")} tooltip={share.tooltip}>
        <MetricStatValue
          emptyLabel={t("player.noData")}
          metric="record-share"
          value={share.value}
        />
      </TooltipStat>
    </StatGroup>
  );
}

type ContributionInsightCopy = {
  readonly value: string | null;
  readonly tooltip: string;
};

function contributedRatioView(
  ratio: ContributedRatio,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): ContributionInsightCopy {
  switch (ratio.kind) {
    case "ready": {
      const contributed = numberFormat.format(ratio.contributed);
      const played = numberFormat.format(ratio.known);
      return {
        value: t("player.matches.contributions.contributedValue", { contributed, played }),
        tooltip: t("player.matches.contributions.contributedTooltip", {
          contributed,
          played,
          playedCount: ratio.known,
        }),
      };
    }
    case "unknown":
      return {
        value: null,
        tooltip: t("player.matches.contributions.contributedTooltip.empty"),
      };
    default: {
      const _exhaustive: never = ratio;
      return _exhaustive;
    }
  }
}

function contributionPaceView(
  pace: ContributionPace,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): ContributionInsightCopy {
  switch (pace.kind) {
    case "ready":
      return {
        value: numberFormat.format(pace.rate),
        tooltip: t("player.matches.contributions.paceTooltip", {
          rate: numberFormat.format(pace.rate),
        }),
      };
    case "unknown":
      return {
        value: null,
        tooltip: t("player.matches.contributions.paceTooltip.empty"),
      };
    default: {
      const _exhaustive: never = pace;
      return _exhaustive;
    }
  }
}

function contributionShareView(
  teamGoalShare: TeamGoalShare,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): ContributionInsightCopy {
  switch (teamGoalShare.kind) {
    case "ready": {
      const percent = numberFormat.format(Math.round(teamGoalShare.ratio * 100));
      return {
        value: t("player.matches.contributions.shareValue", { percent }),
        tooltip: t("player.matches.contributions.shareTooltip", { percent }),
      };
    }
    case "noClubGoals":
      return {
        value: null,
        tooltip: t("player.matches.contributions.shareTooltip.noClubGoals"),
      };
    case "unknown":
      return {
        value: null,
        tooltip: t("player.matches.contributions.shareTooltip.unknown"),
      };
    default: {
      const _exhaustive: never = teamGoalShare;
      return _exhaustive;
    }
  }
}

function contributionCompositionCopy(
  goals: number | null,
  assists: number | null,
  t: Translator,
): string | null {
  if (goals !== null && assists !== null) {
    return t("player.matches.contributions.composition", { goals, assists });
  }
  if (goals !== null) {
    return t("player.matches.contributions.goalsOnly", { count: goals });
  }
  if (assists !== null) {
    return t("player.matches.contributions.assistsOnly", { count: assists });
  }
  return null;
}
