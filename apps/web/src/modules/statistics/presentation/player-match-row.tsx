"use client";

import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type Icon,
  type IconWeight,
} from "@futrob/ui";
import {
  CaretRightIcon,
  HandshakeIcon,
  PlugsIcon,
  RectangleIcon,
  SoccerBallIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { MATCH_OUTCOME_KEYS, MATCH_TYPE_KEYS, SCORING_FEAT_KEYS } from "./player-match-copy.ts";
import { MATCH_OUTCOME_TEXT_CLASS } from "./player-match-tone.ts";
import {
  appearanceScoringFeat,
  isDnfMatch,
  matchMvpDisplayName,
  matchOutcome,
  playedAppearance,
  playerMatchSide,
  providerMatchMode,
  scoringFeatPlayerName,
  showsRedCards,
  showsYellowCards,
  type MatchSortOrder,
  type PlayerMatchesView,
  type ProviderMatchMode,
  type ScoringFeat,
} from "./player-match-view.ts";

export function ProviderMatchRow({
  dateTimeFormat,
  item,
  numberFormat,
  sortOrder,
  showAppearanceStrip = true,
  showMatchType,
  showOpenMatch = true,
  t,
  view,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly item: PlayerRecentProviderMatchDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly sortOrder: MatchSortOrder;
  readonly showAppearanceStrip?: boolean;
  readonly showMatchType: boolean;
  readonly showOpenMatch?: boolean;
  readonly t: Translator;
  readonly view: PlayerMatchesView;
}) {
  const { match } = item;
  const occurredAt = new Date(match.occurredAt);
  const mode = providerMatchMode(item);
  const typeLabel = showMatchType && mode ? t(MATCH_TYPE_KEYS[mode]) : null;
  const outcome = matchOutcome(item);
  const outcomeLabel = outcome === "unknown" ? null : t(MATCH_OUTCOME_KEYS[outcome]);
  const feat = appearanceScoringFeat(item);
  const featLabel = feat ? t(SCORING_FEAT_KEYS[feat]) : null;
  const featScorerName = scoringFeatPlayerName(item);
  const mvpName = matchMvpDisplayName(item);
  const mvpLabel = mvpName ? t("player.matches.mvp.named", { name: mvpName }) : null;
  const dnf = isDnfMatch(item);
  const notPlayedLabel = notPlayedMessage(item, t);
  const side = playerMatchSide(item);
  const accessibleName = [
    match.home.name,
    String(match.home.goals),
    t("player.matches.vs"),
    String(match.away.goals),
    match.away.name,
    typeLabel,
    notPlayedLabel,
    outcomeLabel,
    dnf ? t("player.matches.dnf") : null,
    featLabel,
    mvpLabel,
    appearanceRedCardsAria(item, t),
    dateTimeFormat.format(occurredAt),
  ]
    .filter((part): part is string => part !== null)
    .join(" ");

  const { locale } = useI18n();
  const timeLabel = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(occurredAt);

  return (
    <li aria-label={accessibleName} className="relative">
      <div className="@container relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <MatchPitchWash
          awayGoals={match.away.goals}
          awayImageUrl={match.away.imageUrl}
          homeGoals={match.home.goals}
          homeImageUrl={match.home.imageUrl}
        />
        <div className="relative flex min-h-52 flex-1 flex-col px-4 py-4 @lg:px-6 @lg:py-6">
          <div
            className={
              showOpenMatch ? "flex items-start justify-between gap-2" : "flex items-start gap-2"
            }
          >
            <MatchHeaderMeta
              items={[
                typeLabel && mode ? (
                  <Badge data-match-type={mode} key="type" variant={matchTypeBadgeVariant(mode)}>
                    {typeLabel}
                  </Badge>
                ) : null,
                outcomeLabel ? (
                  <span
                    className={`typo-caption font-semibold ${MATCH_OUTCOME_TEXT_CLASS[outcome]}`}
                    data-match-outcome={outcome === "unknown" ? undefined : outcome}
                    key="outcome"
                  >
                    {outcomeLabel}
                  </span>
                ) : null,
                notPlayedLabel ? (
                  <span
                    className="typo-caption text-muted-foreground"
                    data-played="false"
                    key="played"
                  >
                    <span className="font-medium">{notPlayedLabel}</span>
                  </span>
                ) : null,
                dnf ? (
                  <span
                    aria-label={t("player.matches.dnf")}
                    className="inline-flex text-muted-foreground"
                    data-match-dnf=""
                    key="dnf"
                    title={t("player.matches.dnf")}
                  >
                    <PlugsIcon aria-hidden="true" className="size-3.5" />
                  </span>
                ) : null,
                <time
                  className="typo-caption tabular-nums text-muted-foreground"
                  dateTime={occurredAt.toISOString()}
                  key="when"
                >
                  <span className="font-medium">{timeLabel}</span>
                </time>,
              ]}
            />
            {showOpenMatch ? (
              <Button
                aria-label={t("player.matches.openMatchLabel", {
                  away: match.away.name,
                  awayGoals: match.away.goals,
                  home: match.home.name,
                  homeGoals: match.home.goals,
                })}
                className="shrink-0"
                data-match-chevron=""
                dense
                render={
                  <Link
                    params={{
                      providerKey: match.provider.key,
                      externalMatchId: match.provider.externalMatchId,
                    }}
                    search={{ view, sort: sortOrder }}
                    to="/player/matches/$providerKey/$externalMatchId"
                  />
                }
                role="link"
                size="icon"
                variant="ghost"
              >
                <CaretRightIcon />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-4 @lg:gap-16">
              <MatchClubSide
                imageUrl={match.home.imageUrl}
                name={match.home.name}
                redCards={listedClubRedCards(item, side, "home")}
                redCardsLabel={t("player.matches.metric.redCards")}
              />
              <div
                className="flex items-center justify-center gap-2.5 rounded-lg bg-foreground px-3.5 py-2.5 text-background smooth-shadow-ring-md"
                data-match-score=""
                data-match-outcome={outcome === "unknown" ? undefined : outcome}
              >
                <span
                  className={`typo-score tabular-nums ${scoreDigitClass(match.home.goals, match.away.goals, "home")}`}
                >
                  {match.home.goals}
                </span>
                <span className="typo-score px-0.5 leading-none">{t("player.matches.vs")}</span>
                <span
                  className={`typo-score tabular-nums ${scoreDigitClass(match.home.goals, match.away.goals, "away")}`}
                >
                  {match.away.goals}
                </span>
              </div>
              <MatchClubSide
                imageUrl={match.away.imageUrl}
                name={match.away.name}
                redCards={listedClubRedCards(item, side, "away")}
                redCardsLabel={t("player.matches.metric.redCards")}
              />
            </div>

            {featLabel && feat ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ScoringFeatBadge
                  feat={feat}
                  featLabel={featLabel}
                  scorerName={featScorerName}
                  t={t}
                />
              </div>
            ) : null}
          </div>
        </div>
        {showAppearanceStrip ? (
          <MatchAppearanceStrip item={item} mvpLabel={mvpLabel} numberFormat={numberFormat} t={t} />
        ) : null}
      </div>
    </li>
  );
}

function MatchHeaderMeta({ items }: { readonly items: readonly ReactNode[] }) {
  const parts = items.filter((item) => item !== null && item !== false && item !== undefined);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <span aria-hidden="true" className="typo-caption text-muted-foreground">
              ·
            </span>
          ) : null}
          {part}
        </Fragment>
      ))}
    </div>
  );
}

function matchScoreWinnerSide(homeGoals: number, awayGoals: number): "home" | "away" | "draw" {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

type PitchHalfFill = "win" | "loss" | "drawHome" | "drawAway";

function MatchPitchWash({
  awayGoals,
  awayImageUrl,
  homeGoals,
  homeImageUrl,
}: {
  readonly awayGoals: number;
  readonly awayImageUrl: string | null;
  readonly homeGoals: number;
  readonly homeImageUrl: string | null;
}) {
  const fills = pitchFillsForResult(matchScoreWinnerSide(homeGoals, awayGoals));
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <MatchPitchHalf
        className="[clip-path:polygon(0_0,58%_0,42%_100%,0_100%)]"
        fill={fills.home}
        imageUrl={homeImageUrl}
        side="home"
      />
      <MatchPitchHalf
        className="[clip-path:polygon(58%_0,100%_0,100%_100%,42%_100%)]"
        fill={fills.away}
        imageUrl={awayImageUrl}
        side="away"
      />
    </div>
  );
}

type PitchFills = {
  readonly home: PitchHalfFill;
  readonly away: PitchHalfFill;
};

function pitchFillsForResult(result: "home" | "away" | "draw"): PitchFills {
  switch (result) {
    case "home":
      return { home: "win", away: "loss" };
    case "away":
      return { home: "loss", away: "win" };
    case "draw":
      return { home: "drawHome", away: "drawAway" };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function MatchPitchHalf({
  className,
  fill,
  imageUrl,
  side,
}: {
  readonly className: string;
  readonly fill: PitchHalfFill;
  readonly imageUrl: string | null;
  readonly side: "home" | "away";
}) {
  return (
    <div
      className={`absolute inset-0 ${pitchHalfWashClass(fill)} ${className}`}
      data-pitch-fill={fill}
      data-pitch-half={side}
    >
      {imageUrl === null ? null : (
        <img
          alt=""
          className={`absolute top-1/2 hidden size-[16.1rem] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-10 outline-none grayscale mix-blend-multiply lg:block dark:mix-blend-soft-light ${pitchWatermarkSideClass(side)}`}
          data-pitch-watermark={side}
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      )}
    </div>
  );
}

function pitchWatermarkSideClass(side: "home" | "away"): string {
  switch (side) {
    case "home":
      return "left-[20%]";
    case "away":
      return "left-[80%]";
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

function pitchHalfWashClass(fill: PitchHalfFill): string {
  switch (fill) {
    case "win":
      return "bg-primary/10";
    case "loss":
      return "bg-danger/10";
    case "drawHome":
      return "bg-muted";
    case "drawAway":
      return "bg-muted/50";
    default: {
      const _exhaustive: never = fill;
      return _exhaustive;
    }
  }
}

function MatchAppearanceStrip({
  item,
  mvpLabel,
  numberFormat,
  t,
}: {
  readonly item: PlayerRecentProviderMatchDto;
  readonly mvpLabel: string | null;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const appearance = playedAppearance(item);
  if (!appearance) return null;
  const showYellow = showsYellowCards(appearance.yellowCards);
  const name = appearance.displayName.trim();
  return (
    <div className="relative z-10 flex justify-center px-4 pb-3 @lg:pb-4">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 @lg:gap-x-3 @lg:gap-y-2 @lg:rounded-full @lg:bg-surface @lg:px-4 @lg:py-2.5 @lg:smooth-shadow-ring-sm">
        {mvpLabel ? <MatchMvpBadge label={mvpLabel} /> : null}
        {mvpLabel === null && name !== "" ? (
          <span className="inline-flex min-w-0 max-w-[9rem] items-center gap-1">
            <StarIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
              weight="fill"
            />
            <span className="typo-caption min-w-0 truncate">
              <span className="font-semibold">{name}</span>
            </span>
          </span>
        ) : null}
        <AppearanceStripStat
          icon={SoccerBallIcon}
          metric="recent-goals"
          numberFormat={numberFormat}
          t={t}
          unitKey="player.matches.appearance.goalsUnit"
          value={appearance.goals}
        />
        <AppearanceStripStat
          icon={HandshakeIcon}
          metric="recent-assists"
          numberFormat={numberFormat}
          t={t}
          unitKey="player.matches.appearance.assistsUnit"
          value={appearance.assists}
        />
        {showYellow ? (
          <AppearanceStripStat
            icon={RectangleIcon}
            iconClassName="size-3.5 rotate-90 text-warning"
            iconWeight="fill"
            metric="recent-yellow"
            numberFormat={numberFormat}
            t={t}
            unitKey={null}
            value={appearance.yellowCards}
          />
        ) : null}
        <Badge className="font-semibold" variant={ratingBadgeVariant(appearance.rating)}>
          <StarIcon
            aria-hidden="true"
            className="size-3.5"
            data-metric-icon="recent-rating"
            weight="fill"
          />
          <span className="typo-caption @max-lg:sr-only">
            <span className="font-medium">{t("player.metric.rating")}</span>
          </span>
          {appearance.rating === null ? (
            <span className="typo-caption" data-size="empty">
              <span className="font-medium" data-metric="recent-rating">
                {t("player.noData")}
              </span>
            </span>
          ) : (
            <span className="typo-caption tabular-nums">
              <span className="font-medium" data-metric="recent-rating">
                {numberFormat.format(appearance.rating)}
              </span>
            </span>
          )}
        </Badge>
      </div>
    </div>
  );
}

function MatchMvpBadge({ label }: { readonly label: string }) {
  return (
    <Badge data-mvp="" variant="warning">
      <StarIcon aria-hidden="true" className="text-warning" weight="fill" />
      <span className="font-medium">{label}</span>
    </Badge>
  );
}

function AppearanceStripStat({
  icon: MetricIcon,
  iconClassName = "size-3.5",
  iconWeight = "regular",
  metric,
  numberFormat,
  t,
  unitKey,
  value,
}: {
  readonly icon: Icon;
  readonly iconClassName?: string;
  readonly iconWeight?: IconWeight;
  readonly metric: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
  readonly unitKey:
    | "player.matches.appearance.goalsUnit"
    | "player.matches.appearance.assistsUnit"
    | null;
  readonly value: number | null;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <MetricIcon
        aria-hidden="true"
        className={iconClassName}
        data-metric-icon={metric}
        weight={iconWeight}
      />
      {value === null ? (
        <span className="typo-caption" data-size="empty">
          <span className="font-medium" data-metric={metric}>
            {t("player.noData")}
          </span>
        </span>
      ) : (
        <>
          <span className="typo-caption tabular-nums text-foreground">
            <span className="font-semibold" data-metric={metric}>
              {numberFormat.format(value)}
            </span>
          </span>
          {unitKey === null ? null : (
            <span className="typo-caption @max-lg:sr-only">
              <span className="font-medium">{t(unitKey, { count: value })}</span>
            </span>
          )}
        </>
      )}
    </span>
  );
}

function notPlayedMessage(item: PlayerRecentProviderMatchDto, t: Translator): string | null {
  return item.kind === "not_played" ? t("player.matches.notPlayed") : null;
}

function listedClubRedCards(
  item: PlayerRecentProviderMatchDto,
  side: "home" | "away" | null,
  column: "home" | "away",
): number | null {
  const appearance = playedAppearance(item);
  return appearance && side === column ? appearance.redCards : null;
}

function appearanceRedCardsAria(item: PlayerRecentProviderMatchDto, t: Translator): string | null {
  const appearance = playedAppearance(item);
  if (!appearance || !showsRedCards(appearance.redCards) || appearance.redCards === null) {
    return null;
  }
  return `${t("player.matches.metric.redCards")} ${appearance.redCards}`;
}

function MatchClubSide({
  imageUrl,
  name,
  redCards,
  redCardsLabel,
}: {
  readonly imageUrl: string | null;
  readonly name: string;
  readonly redCards: number | null;
  readonly redCardsLabel: string;
}) {
  return (
    <div className="flex w-24 min-w-0 flex-col items-center gap-1 @lg:w-36">
      <ClubCrestAvatar
        className="size-16 shrink-0 @lg:size-24"
        fallbackClassName="text-base"
        framed={false}
        imageUrl={imageUrl}
        name={name}
      />
      <MatchClubMeta name={name} redCards={redCards} redCardsLabel={redCardsLabel} />
    </div>
  );
}

function MatchClubMeta({
  name,
  redCards,
  redCardsLabel,
}: {
  readonly name: string;
  readonly redCards: number | null;
  readonly redCardsLabel: string;
}) {
  const showRed = showsRedCards(redCards);

  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
      <p className="typo-subtitle min-w-0 w-full max-w-full truncate text-nowrap text-center text-muted-foreground whitespace-nowrap">
        <span className="font-semibold">{name}</span>
      </p>
      {showRed && redCards !== null ? (
        <span
          aria-label={`${redCardsLabel} ${redCards}`}
          className="inline-flex items-center gap-0.5 tabular-nums typo-caption text-danger"
          data-metric="recent-red"
        >
          <RectangleIcon
            aria-hidden
            className="size-3 rotate-[84deg] text-danger"
            data-card-icon="red"
            weight="fill"
          />
          {redCards}
        </span>
      ) : null}
    </div>
  );
}

function ScoringFeatBadge({
  feat,
  featLabel,
  scorerName,
  t,
}: {
  readonly feat: ScoringFeat;
  readonly featLabel: string;
  readonly scorerName: string | null;
  readonly t: Translator;
}) {
  const badge = (
    <Badge data-feat-scorer={scorerName ?? undefined} data-scoring-feat={feat} variant="warning">
      <SoccerBallIcon aria-hidden="true" />
      {featLabel}
    </Badge>
  );
  if (scorerName === null) return badge;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex max-w-full" tabIndex={0} />}>
        {badge}
      </TooltipTrigger>
      <TooltipContent>{t("player.matches.feat.scorer", { name: scorerName })}</TooltipContent>
    </Tooltip>
  );
}

function ratingBadgeVariant(rating: number | null): "primary" | "outline" {
  return rating !== null && rating >= 7 ? "primary" : "outline";
}

function scoreDigitClass(homeGoals: number, awayGoals: number, side: "home" | "away"): string {
  const leads = side === "home" ? homeGoals > awayGoals : awayGoals > homeGoals;
  return leads ? "text-brand-300 dark:text-primary" : "text-background";
}

function matchTypeBadgeVariant(mode: ProviderMatchMode): "emphasis" | "info" | "neutral" {
  switch (mode) {
    case "leagueMatch":
      return "emphasis";
    case "playoffMatch":
      return "info";
    case "friendlyMatch":
      return "neutral";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
