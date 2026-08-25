"use client";

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, StatGroup, StatValue } from "@futrob/ui";
import { EqualsIcon, TrendDownIcon, TrophyIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { IconStat } from "@/shared/presentation/stats/icon-stat.tsx";
import {
  statTripleGrid,
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

const styles = stylex.create({
  container: {
    containerType: "inline-size",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    alignItems: "stretch",
    gap: "0.75rem",
  },
  cards1: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 64rem)": "minmax(0, 28rem)",
    },
  },
  cards2: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 64rem)": "repeat(2, minmax(0, 28rem))",
    },
  },
  cards3: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 48rem)": "repeat(2, minmax(0, 1fr))",
      "@container (min-width: 64rem)": "repeat(3, minmax(0, 1fr))",
    },
  },
  placePerformance: {
    gridColumnStart: {
      default: null,
      "@container (min-width: 48rem)": 1,
      "@container (min-width: 64rem)": "auto",
    },
    gridRowStart: {
      default: null,
      "@container (min-width: 48rem)": 1,
      "@container (min-width: 64rem)": "auto",
    },
  },
  placeRecord: {
    gridColumn: {
      default: null,
      "@container (min-width: 48rem)": "span 2",
      "@container (min-width: 64rem)": "span 1",
    },
    gridRowStart: {
      default: null,
      "@container (min-width: 48rem)": 2,
      "@container (min-width: 64rem)": "auto",
    },
  },
  placeContributions: {
    gridColumnStart: {
      default: null,
      "@container (min-width: 48rem)": 2,
      "@container (min-width: 64rem)": "auto",
    },
    gridRowStart: {
      default: null,
      "@container (min-width: 48rem)": 1,
      "@container (min-width: 64rem)": "auto",
    },
  },
});

function visibleRecordCardCount(showPerformance: boolean, showContributions: boolean): 1 | 2 | 3 {
  if (showPerformance && showContributions) return 3;
  if (showPerformance || showContributions) return 2;
  return 1;
}

function recordGridStyle(visibleCards: 1 | 2 | 3) {
  switch (visibleCards) {
    case 1:
      return styles.cards1;
    case 2:
      return styles.cards2;
    case 3:
      return styles.cards3;
  }
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
  const threeCard = visibleCards === 3;

  return (
    <div {...applyStyles(styles.container)}>
      <div
        aria-label={t("player.matches.record.label")}
        data-record-cards={visibleCards}
        role="group"
        {...applyStyles(styles.grid, recordGridStyle(visibleCards))}
      >
        {showPerformance ? (
          <SummaryCard
            data-record-slot="performance"
            headingId="player-matches-stats-performance"
            title={t("player.matches.stats.performance")}
            {...(threeCard ? applyStyles(styles.placePerformance) : {})}
          >
            <PerformancePanel matches={matches} numberFormat={numberFormat} record={record} />
          </SummaryCard>
        ) : null}
        <SummaryCard
          data-record-slot="record"
          footer={showsRecentForm(matches) ? <RecentForm matches={matches} /> : null}
          headingId="player-matches-stats-record"
          title={t("player.matches.stats.record")}
          {...(threeCard ? applyStyles(styles.placeRecord) : {})}
        >
          <StatGroup
            className={applyStyles(statTripleGrid).className}
            style={applyStyles(statTripleGrid).style}
          >
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
            data-record-slot="contributions"
            footer={
              record.contributions.playedAppearances > 0 ? (
                <ContributionInsights numberFormat={numberFormat} record={record} />
              ) : null
            }
            headingId="player-matches-stats-contributions"
            title={t("player.matches.stats.contributions")}
            {...(threeCard ? applyStyles(styles.placeContributions) : {})}
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
    <div {...applyStyles(styles.container)}>
      <div
        aria-busy="true"
        aria-label={t("player.matches.record.loading")}
        data-record-cards="3"
        role="status"
        {...applyStyles(styles.grid, styles.cards3)}
      >
        <SummaryCardLoading
          data-record-slot="performance"
          {...applyStyles(styles.placePerformance)}
        />
        <SummaryCardLoading data-record-slot="record" {...applyStyles(styles.placeRecord)} />
        <SummaryCardLoading
          data-record-slot="contributions"
          {...applyStyles(styles.placeContributions)}
        />
      </div>
    </div>
  );
}
