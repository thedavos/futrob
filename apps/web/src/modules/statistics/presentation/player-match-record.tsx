"use client";

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import { StatGroup, StatValue } from "@futrob/ui";
import { EqualsIcon, TrendDownIcon, TrophyIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { IconStat } from "@/shared/presentation/stats/icon-stat.tsx";
import {
  STAT_TRIPLE_GRID_CLASS_NAME,
  SummaryCard,
  SummaryCardLoading,
} from "@/shared/presentation/stats/summary-card.tsx";
import { ContributionInsights, ContributionsHero } from "./player-match-contributions.tsx";
import { RecentForm } from "./player-match-form.tsx";
import { PerformancePanel } from "./player-match-performance.tsx";
import {
  showsContributionStats,
  showsPerformanceStats,
  showsRecentForm,
  type MatchRecordSummary,
} from "./player-match-view.ts";

const RECORD_STAT_GRID_BASE_CLASS_NAME = "grid grid-cols-1 items-stretch gap-3";
const RECORD_STAT_GRID_CLASS_NAME = {
  1: `${RECORD_STAT_GRID_BASE_CLASS_NAME} @5xl:grid-cols-[minmax(0,28rem)]`,
  2: `${RECORD_STAT_GRID_BASE_CLASS_NAME} @5xl:grid-cols-[repeat(2,minmax(0,28rem))]`,
  3: `${RECORD_STAT_GRID_BASE_CLASS_NAME} @5xl:grid-cols-3`,
} as const satisfies Record<1 | 2 | 3, string>;

function visibleRecordCardCount(showPerformance: boolean, showContributions: boolean): 1 | 2 | 3 {
  if (showPerformance && showContributions) return 3;
  if (showPerformance || showContributions) return 2;
  return 1;
}

export function ViewRecord({
  matches,
  numberFormat,
  record,
}: {
  readonly matches: readonly PlayerRecentProviderMatchDto[];
  readonly numberFormat: Intl.NumberFormat;
  readonly record: MatchRecordSummary;
}) {
  const { t } = useI18n();
  const showPerformance = showsPerformanceStats(record);
  const showContributions = showsContributionStats(record);
  const visibleCards = visibleRecordCardCount(showPerformance, showContributions);

  return (
    <div className="@container">
      <div
        aria-label={t("player.matches.record.label")}
        className={RECORD_STAT_GRID_CLASS_NAME[visibleCards]}
        role="group"
      >
        {showPerformance ? (
          <SummaryCard
            headingId="player-matches-stats-performance"
            title={t("player.matches.stats.performance")}
          >
            <PerformancePanel matches={matches} numberFormat={numberFormat} record={record} />
          </SummaryCard>
        ) : null}
        <SummaryCard
          footer={showsRecentForm(matches) ? <RecentForm matches={matches} /> : null}
          headingId="player-matches-stats-record"
          title={t("player.matches.stats.record")}
        >
          <StatGroup className={STAT_TRIPLE_GRID_CLASS_NAME}>
            <IconStat
              icon={TrophyIcon}
              label={t("player.matches.record.wins")}
              metric="record-wins"
            >
              <StatValue data-metric="record-wins" size="compact">
                {numberFormat.format(record.wins)}
              </StatValue>
            </IconStat>
            <IconStat
              icon={EqualsIcon}
              label={t("player.matches.record.draws")}
              metric="record-draws"
            >
              <StatValue data-metric="record-draws" size="compact">
                {numberFormat.format(record.draws)}
              </StatValue>
            </IconStat>
            <IconStat
              icon={TrendDownIcon}
              label={t("player.matches.record.losses")}
              metric="record-losses"
            >
              <StatValue data-metric="record-losses" size="compact">
                {numberFormat.format(record.losses)}
              </StatValue>
            </IconStat>
          </StatGroup>
        </SummaryCard>
        {showContributions ? (
          <SummaryCard
            footer={
              record.contributions.playedAppearances > 0 ? (
                <ContributionInsights numberFormat={numberFormat} record={record} />
              ) : null
            }
            headingId="player-matches-stats-contributions"
            title={t("player.matches.stats.contributions")}
          >
            <ContributionsHero numberFormat={numberFormat} record={record} />
          </SummaryCard>
        ) : null}
      </div>
    </div>
  );
}

export function RecordLoading() {
  const { t } = useI18n();
  return (
    <div className="@container">
      <div
        aria-busy="true"
        aria-label={t("player.matches.record.loading")}
        className={RECORD_STAT_GRID_CLASS_NAME[3]}
        role="status"
      >
        <SummaryCardLoading />
        <SummaryCardLoading />
        <SummaryCardLoading />
      </div>
    </div>
  );
}
