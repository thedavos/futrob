"use client";

import type { ReactNode } from "react";
import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import {
  Card,
  CardContent,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type Icon,
  type IconWeight,
} from "@futrob/ui";
import {
  ChartLineUpIcon,
  EqualsIcon,
  TrendDownIcon,
  TrendUpIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { FORM_OUTCOME_SHORT_KEYS, FORM_SEGMENT_TOOLTIP_KEYS } from "./player-match-copy.ts";
import { FORM_RESULT_FILL_CLASS, FORM_SEGMENT_CLASS } from "./player-match-tone.ts";
import {
  formTimeline,
  lastFormGames,
  matchOutcome,
  opponentClubName,
  playerMatchSide,
  ratingTrendVsLast,
  RATING_SCALE_MAX,
  showsRecentForm,
  type ContributionPace,
  type ContributedRatio,
  type MatchRecordSummary,
  type RatingTrend,
  type TeamGoalShare,
} from "./player-match-view.ts";

/** One card per group; stack on mobile, three columns from `sm`. */
const RECORD_STAT_GRID_CLASS_NAME = "grid grid-cols-1 items-stretch gap-3 md:grid-cols-3";
const RECORD_TRIPLE_STAT_CLASS_NAME = "grid w-full grid-cols-3 gap-3 [&>[data-slot=stat]]:min-w-0";

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
  return (
    <div
      aria-label={t("player.matches.record.label")}
      className={RECORD_STAT_GRID_CLASS_NAME}
      role="group"
    >
      <RecordStatGroup
        headingId="player-matches-stats-performance"
        title={t("player.matches.stats.performance")}
      >
        <PerformancePanel matches={matches} numberFormat={numberFormat} record={record} />
      </RecordStatGroup>
      <RecordStatGroup
        footer={showsRecentForm(matches) ? <RecentForm matches={matches} /> : null}
        headingId="player-matches-stats-record"
        title={t("player.matches.stats.record")}
      >
        <StatGroup className={RECORD_TRIPLE_STAT_CLASS_NAME}>
          <RecordStat
            icon={TrophyIcon}
            label={t("player.matches.record.wins")}
            metric="record-wins"
          >
            <StatValue data-metric="record-wins" size="compact">
              {numberFormat.format(record.wins)}
            </StatValue>
          </RecordStat>
          <RecordStat
            icon={EqualsIcon}
            label={t("player.matches.record.draws")}
            metric="record-draws"
          >
            <StatValue data-metric="record-draws" size="compact">
              {numberFormat.format(record.draws)}
            </StatValue>
          </RecordStat>
          <RecordStat
            icon={TrendDownIcon}
            label={t("player.matches.record.losses")}
            metric="record-losses"
          >
            <StatValue data-metric="record-losses" size="compact">
              {numberFormat.format(record.losses)}
            </StatValue>
          </RecordStat>
        </StatGroup>
      </RecordStatGroup>
      <RecordStatGroup
        footer={
          record.contributions.playedAppearances > 0 ? (
            <ContributionInsights numberFormat={numberFormat} record={record} />
          ) : null
        }
        headingId="player-matches-stats-contributions"
        title={t("player.matches.stats.contributions")}
      >
        <ContributionsHero numberFormat={numberFormat} record={record} />
      </RecordStatGroup>
    </div>
  );
}

export function RecordLoading() {
  const { t } = useI18n();
  return (
    <div
      aria-busy="true"
      aria-label={t("player.matches.record.loading")}
      className={RECORD_STAT_GRID_CLASS_NAME}
      role="status"
    >
      <RecordLoadingCard />
      <RecordLoadingCard />
      <RecordLoadingCard />
    </div>
  );
}

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
  const trend = ratingTrendVsLast(matches);
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center items-center">
      <div className="flex min-w-0 items-center gap-6">
        <AverageRatingRing numberFormat={numberFormat} rating={record.averageRating} />
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
        <CompactMetricValue
          metric="record-rating"
          numberFormat={numberFormat}
          size="compact"
          value={rating}
        />
        <p className="typo-caption text-pretty leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function RecentForm({
  matches,
}: {
  readonly matches: readonly PlayerRecentProviderMatchDto[];
}) {
  const { t } = useI18n();
  const timeline = formTimeline(matches);
  const lastGames = lastFormGames(matches);

  return (
    <div
      aria-labelledby="player-matches-form-heading"
      className="flex flex-col gap-2"
      data-recent-form=""
      role="group"
    >
      <div
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface"
        data-recent-form-bar=""
      >
        {timeline.map((item) => (
          <FormSegment item={item} key={item.match.id} />
        ))}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p
          className="typo-caption font-medium min-w-0 text-muted-foreground"
          id="player-matches-form-heading"
        >
          {t("player.matches.form.label")}
        </p>
        <ol className="flex shrink-0 flex-wrap gap-1" data-last-games="">
          {lastGames.map((item) => (
            <FormResultMark item={item} key={item.match.id} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function ContributionsHero({
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
        <CompactMetricValue
          metric="record-goals-plus-assists"
          numberFormat={numberFormat}
          size="compact"
          value={record.goalsPlusAssists}
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

function ContributionInsights({
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
    <StatGroup className={`${RECORD_TRIPLE_STAT_CLASS_NAME} [&>*]:min-w-0`}>
      <ContributionStat
        label={t("player.matches.contributions.contributed")}
        tooltip={contributed.tooltip}
      >
        {contributed.value === null ? (
          <CompactMetricValue
            metric="record-contributed"
            numberFormat={numberFormat}
            value={null}
          />
        ) : (
          <StatValue data-metric="record-contributed" size="compact">
            {contributed.value}
          </StatValue>
        )}
      </ContributionStat>
      <ContributionStat label={t("player.matches.contributions.pace")} tooltip={pace.tooltip}>
        {pace.value === null ? (
          <CompactMetricValue metric="record-pace" numberFormat={numberFormat} value={null} />
        ) : (
          <StatValue data-metric="record-pace" size="compact">
            {pace.value}
          </StatValue>
        )}
      </ContributionStat>
      <ContributionStat label={t("player.matches.contributions.share")} tooltip={share.tooltip}>
        {share.value === null ? (
          <CompactMetricValue metric="record-share" numberFormat={numberFormat} value={null} />
        ) : (
          <StatValue data-metric="record-share" size="compact">
            {share.value}
          </StatValue>
        )}
      </ContributionStat>
    </StatGroup>
  );
}

function contributedRatioView(
  ratio: ContributedRatio,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): { readonly value: string | null; readonly tooltip: string } {
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
): { readonly value: string | null; readonly tooltip: string } {
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
): { readonly value: string | null; readonly tooltip: string } {
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

function ContributionStat({
  children,
  label,
  tooltip,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={tooltip}
            className="min-h-11 min-w-0 w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="button"
          />
        }
      >
        <Stat className="gap-0.5">
          {children}
          <StatLabel>{label}</StatLabel>
        </Stat>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
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

function RecordStatGroup({
  children,
  footer,
  headingId,
  title,
}: {
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly headingId: string;
  readonly title: string;
}) {
  return (
    <Card aria-labelledby={headingId} className="h-full min-w-0">
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <h2 className="typo-label" id={headingId}>
          {title}
        </h2>
        <div className="h-full flex flex-col justify-center gap-4">
          <div>{children}</div>
          {footer}
        </div>
      </CardContent>
    </Card>
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

function FormSegment({ item }: { readonly item: PlayerRecentProviderMatchDto }) {
  const { t } = useI18n();
  const outcome = matchOutcome(item);
  const label = formSegmentLabel(item, t);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            className={`min-w-0 flex-1 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${FORM_SEGMENT_CLASS[outcome]}`}
            data-form-segment={outcome}
            type="button"
          />
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function formSegmentLabel(item: PlayerRecentProviderMatchDto, t: Translator): string {
  const outcome = matchOutcome(item);
  const opponent = opponentClubName(item);
  if (outcome === "unknown" || opponent === null) {
    return t("player.matches.form.unknownMatch", {
      home: item.match.home.name,
      away: item.match.away.name,
      score: `${item.match.home.goals} ${t("player.matches.vs")} ${item.match.away.goals}`,
    });
  }
  return t(FORM_SEGMENT_TOOLTIP_KEYS[outcome], {
    score: listedScoreline(item, t),
    opponent,
  });
}

function listedScoreline(item: PlayerRecentProviderMatchDto, t: Translator): string {
  const side = playerMatchSide(item);
  const scored = side === "away" ? item.match.away.goals : item.match.home.goals;
  const conceded = side === "away" ? item.match.home.goals : item.match.away.goals;
  return `${scored} ${t("player.matches.vs")} ${conceded}`;
}

function FormResultMark({ item }: { readonly item: PlayerRecentProviderMatchDto }) {
  const { t } = useI18n();
  const outcome = matchOutcome(item);
  const label = formSegmentLabel(item, t);

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={label}
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md typo-label ${FORM_RESULT_FILL_CLASS[outcome]}`}
              data-last-game={item.match.id}
              data-last-game-outcome={outcome}
              type="button"
            />
          }
        >
          <span aria-hidden="true">{t(FORM_OUTCOME_SHORT_KEYS[outcome])}</span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </li>
  );
}

function RecordStat({
  children,
  icon: MetricIcon,
  iconWeight = "regular",
  label,
  metric,
}: {
  readonly children: ReactNode;
  readonly icon: Icon;
  readonly iconWeight?: IconWeight;
  readonly label: string;
  readonly metric: string;
}) {
  return (
    <Stat className="gap-0.5">
      <StatLabel className="flex items-center gap-1">
        <MetricIcon
          aria-hidden="true"
          className="size-3.5"
          data-metric-icon={metric}
          weight={iconWeight}
        />
        {label}
      </StatLabel>
      {children}
    </Stat>
  );
}

function RecordLoadingCard() {
  return (
    <Card className="h-full min-w-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-16" />
      </CardContent>
    </Card>
  );
}

function CompactMetricValue({
  metric,
  numberFormat,
  size = "compact",
  value,
}: {
  readonly metric?: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly size?: "compact" | "default";
  readonly value: number | null;
}) {
  const { t } = useI18n();
  return (
    <StatValue
      data-metric={metric}
      size={value === null ? "empty" : size}
      tone={value === null ? "muted" : "default"}
    >
      {value === null ? t("player.noData") : numberFormat.format(value)}
    </StatValue>
  );
}

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

function trendDirection(delta: number): TrendDirection {
  if (delta > 0.005) return "up";
  if (delta < -0.005) return "down";
  return "flat";
}

function formatSignedNumber(value: number, numberFormat: Intl.NumberFormat): string {
  const formatted = numberFormat.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}
