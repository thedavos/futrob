"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type {
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type Icon,
  type IconWeight,
} from "@futrob/ui";
import {
  CaretRightIcon,
  EqualsIcon,
  GameControllerIcon,
  HandshakeIcon,
  PlugsIcon,
  RectangleIcon,
  SoccerBallIcon,
  StarIcon,
  TrendDownIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { AddClubDialog } from "@/modules/teams/presentation/add-club-dialog.tsx";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useWorkspaceSelectedClubId } from "@/shared/presentation/shell/use-workspace-selection.tsx";
import {
  appearanceScoringFeat,
  calendarDayKind,
  filterRecentMatches,
  groupMatchesByDay,
  isDnfMatch,
  isPlayerMatchesView,
  matchesForView,
  matchMvpDisplayName,
  matchOutcome,
  PLAYER_MATCHES_VIEWS,
  playedAppearance,
  playerMatchSide,
  providerMatchMode,
  scoringFeatPlayerName,
  showsMatchTypeBadge,
  showsRedCards,
  showsYellowCards,
  startOfLocalDay,
  summarizeMatchRecord,
  type CalendarDayKind,
  type MatchDayGroup,
  type MatchOutcome,
  type MatchRecordSummary,
  type PlayerMatchesView,
  type ProviderMatchMode,
  type ScoringFeat,
} from "./player-match-view.ts";
import { useMyRecentMatchesQuery } from "./statistics-queries.ts";

export type { PlayerMatchesView };

/** 2 on mobile, 3 on tablet, 6 in a row when the shell content is wide. */
const RECORD_STAT_GRID_CLASS_NAME =
  "grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 xl:grid-cols-6";

export function PlayerMatchesPage({
  externalClubId: clubIdProp,
  now,
  onViewChange,
  view,
}: {
  readonly externalClubId?: string;
  readonly now?: Date;
  readonly onViewChange?: (view: PlayerMatchesView) => void;
  readonly view?: PlayerMatchesView;
}) {
  if (clubIdProp !== undefined) {
    return (
      <PlayerMatchesPageLoaded
        externalClubId={clubIdProp}
        now={now}
        onViewChange={onViewChange}
        profileReady
        view={view}
      />
    );
  }
  return <PlayerMatchesFromWorkspace now={now} onViewChange={onViewChange} view={view} />;
}

function PlayerMatchesFromWorkspace({
  now,
  onViewChange,
  view,
}: {
  readonly now?: Date;
  readonly onViewChange?: (view: PlayerMatchesView) => void;
  readonly view?: PlayerMatchesView;
}) {
  const selectedClub = useWorkspaceSelectedClubId();
  return (
    <PlayerMatchesPageLoaded
      externalClubId={selectedClub.externalClubId}
      now={now}
      onViewChange={onViewChange}
      profileReady={selectedClub.profileReady}
      view={view}
    />
  );
}

function PlayerMatchesPageLoaded({
  externalClubId,
  now = new Date(),
  onViewChange,
  profileReady,
  view = "recent",
}: {
  readonly externalClubId: string | undefined;
  readonly now?: Date;
  readonly onViewChange?: (view: PlayerMatchesView) => void;
  readonly profileReady: boolean;
  readonly view?: PlayerMatchesView;
}) {
  const { t, locale } = useI18n();
  const recentQuery = useMyRecentMatchesQuery(externalClubId, profileReady);
  const [addClubOpen, setAddClubOpen] = useState(false);
  const [uncontrolledView, setUncontrolledView] = useState<PlayerMatchesView>(view);
  const activeView = onViewChange === undefined ? uncontrolledView : view;
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 2,
  });
  const dateTimeFormat = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    hourCycle: "h23",
  });
  const dayDateFormat = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const status = sectionStatus(recentQuery);
  const result = recentQuery.data;

  function setActiveView(next: PlayerMatchesView) {
    if (onViewChange === undefined) {
      setUncontrolledView(next);
      return;
    }
    onViewChange(next);
  }

  return (
    <main className="w-full">
      <TooltipProvider>
        <PageHeader>
          <PageHeaderTitle>{t("player.matches.title")}</PageHeaderTitle>
          <PageHeaderDescription>{t("player.matches.description")}</PageHeaderDescription>
        </PageHeader>

        <MatchesBody
          activeView={activeView}
          dateTimeFormat={dateTimeFormat}
          dayDateFormat={dayDateFormat}
          now={now}
          numberFormat={numberFormat}
          onAddClub={() => setAddClubOpen(true)}
          onRetry={() => void recentQuery.refetch()}
          onViewChange={setActiveView}
          result={result}
          status={status}
          t={t}
        />

        <AddClubDialog onOpenChange={setAddClubOpen} open={addClubOpen} />
      </TooltipProvider>
    </main>
  );
}

function MatchesBody({
  activeView,
  dateTimeFormat,
  dayDateFormat,
  now,
  numberFormat,
  onAddClub,
  onRetry,
  onViewChange,
  result,
  status,
  t,
}: {
  readonly activeView: PlayerMatchesView;
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly onAddClub: () => void;
  readonly onRetry: () => void;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly result: GetMyRecentMatchesResponse | undefined;
  readonly status: SectionStatus;
  readonly t: Translator;
}) {
  if (status === "pending") {
    return (
      <div className="space-y-8">
        <RecordLoading t={t} />
        <MatchesTabs activeView={activeView} onViewChange={onViewChange} t={t}>
          <TabsContent value={activeView}>
            <MatchesLoading label={t("player.matches.loading")} />
          </TabsContent>
        </MatchesTabs>
      </div>
    );
  }

  if (status === "error") {
    return <SectionError message={t("player.matches.error")} onRetry={onRetry} t={t} />;
  }

  if (result === undefined) return null;

  switch (result.status) {
    case "needs_club":
      return (
        <EmptyState className="min-h-0">
          <EmptyStateIcon>
            <SoccerBallIcon aria-hidden="true" />
          </EmptyStateIcon>
          <EmptyStateTitle>{t("player.matches.recent.needsClub.title")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("player.matches.recent.needsClub.description")}
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button onClick={onAddClub}>{t("shell.workspace.addClub")}</Button>
          </EmptyStateActions>
        </EmptyState>
      );
    case "needs_game_account":
      return (
        <EmptyState className="min-h-0">
          <EmptyStateIcon>
            <GameControllerIcon aria-hidden="true" />
          </EmptyStateIcon>
          <EmptyStateTitle>{t("player.matches.recent.needsGameAccount.title")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("player.matches.recent.needsGameAccount.description")}
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button render={<Link to="/player/game-accounts" />}>
              {t("player.gameData.review")}
            </Button>
          </EmptyStateActions>
        </EmptyState>
      );
    case "ready":
      return (
        <ReadyMatches
          activeView={activeView}
          dateTimeFormat={dateTimeFormat}
          dayDateFormat={dayDateFormat}
          matches={result.matches}
          now={now}
          numberFormat={numberFormat}
          onViewChange={onViewChange}
          t={t}
        />
      );
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function ReadyMatches({
  activeView,
  dateTimeFormat,
  dayDateFormat,
  matches,
  now,
  numberFormat,
  onViewChange,
  t,
}: {
  readonly activeView: PlayerMatchesView;
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly matches: readonly PlayerRecentProviderMatchDto[];
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly t: Translator;
}) {
  const recentMatches = filterRecentMatches(matches, now);
  const visibleMatches = matchesForView(matches, activeView, now);
  const record = summarizeMatchRecord(visibleMatches);
  const groups = groupMatchesByDay(visibleMatches);

  return (
    <div className="space-y-8">
      {visibleMatches.length > 0 ? (
        <ViewRecord numberFormat={numberFormat} record={record} t={t} />
      ) : null}
      <MatchesTabs activeView={activeView} onViewChange={onViewChange} t={t}>
        {PLAYER_MATCHES_VIEWS.map((view) => (
          <TabsContent key={view} value={view}>
            {activeView === view ? (
              view === "recent" ? (
                <RecentTabBody
                  dateTimeFormat={dateTimeFormat}
                  dayDateFormat={dayDateFormat}
                  groups={groups}
                  hasOlderMatches={matches.length > recentMatches.length}
                  now={now}
                  numberFormat={numberFormat}
                  onShowAll={() => onViewChange("all")}
                  showMatchType
                  t={t}
                />
              ) : (
                <MatchDayLists
                  dateTimeFormat={dateTimeFormat}
                  dayDateFormat={dayDateFormat}
                  emptyDescription={t(emptyDescriptionKey(view))}
                  emptyTitle={t(emptyTitleKey(view))}
                  groups={groups}
                  historyLabel={t(historyLabelKey(view))}
                  now={now}
                  numberFormat={numberFormat}
                  showMatchType={showsMatchTypeBadge(view)}
                  t={t}
                />
              )
            ) : null}
          </TabsContent>
        ))}
      </MatchesTabs>
    </div>
  );
}

function RecentTabBody({
  dateTimeFormat,
  dayDateFormat,
  groups,
  hasOlderMatches,
  now,
  numberFormat,
  onShowAll,
  showMatchType,
  t,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly groups: readonly MatchDayGroup[];
  readonly hasOlderMatches: boolean;
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly onShowAll: () => void;
  readonly showMatchType: boolean;
  readonly t: Translator;
}) {
  if (groups.length === 0 && hasOlderMatches) {
    return (
      <EmptyState className="min-h-0">
        <EmptyStateIcon>
          <SoccerBallIcon aria-hidden="true" />
        </EmptyStateIcon>
        <EmptyStateTitle>{t("player.matches.recent.emptyOlder.title")}</EmptyStateTitle>
        <EmptyStateDescription>
          {t("player.matches.recent.emptyOlder.description")}
        </EmptyStateDescription>
        <EmptyStateActions>
          <Button onClick={onShowAll} variant="secondary">
            {t("player.matches.recent.emptyOlder.action")}
          </Button>
        </EmptyStateActions>
      </EmptyState>
    );
  }

  return (
    <MatchDayLists
      dateTimeFormat={dateTimeFormat}
      dayDateFormat={dayDateFormat}
      emptyDescription={t("player.matches.recent.emptyDescription")}
      emptyTitle={t("player.matches.recent.emptyTitle")}
      groups={groups}
      historyLabel={t("player.matches.recent.historyLabel")}
      now={now}
      numberFormat={numberFormat}
      showMatchType={showMatchType}
      t={t}
    />
  );
}

function MatchDayLists({
  dateTimeFormat,
  dayDateFormat,
  emptyDescription,
  emptyTitle,
  groups,
  historyLabel,
  now,
  numberFormat,
  showMatchType,
  t,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly emptyDescription: string;
  readonly emptyTitle: string;
  readonly groups: readonly MatchDayGroup[];
  readonly historyLabel: string;
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly showMatchType: boolean;
  readonly t: Translator;
}) {
  if (groups.length === 0) {
    return (
      <EmptyState className="min-h-0">
        <EmptyStateIcon>
          <SoccerBallIcon aria-hidden="true" />
        </EmptyStateIcon>
        <EmptyStateTitle>{emptyTitle}</EmptyStateTitle>
        <EmptyStateDescription>{emptyDescription}</EmptyStateDescription>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8" role="region" aria-label={historyLabel}>
      {groups.map((group) => {
        const kind = calendarDayKind(group.occurredAt, now);
        const heading = dayHeading(kind, group.occurredAt, dayDateFormat, t);
        return (
          <section className="flex flex-col gap-4" key={group.dayKey}>
            <h2 className="typo-label text-muted-foreground">
              <time dateTime={group.dayKey}>{heading}</time>
            </h2>
            <ol className="flex flex-col gap-3">
              {group.matches.map((item) => (
                <ProviderMatchRow
                  dateTimeFormat={dateTimeFormat}
                  dayDateFormat={dayDateFormat}
                  item={item}
                  key={`${item.match.provider.key}:${item.match.provider.externalMatchId}`}
                  now={now}
                  numberFormat={numberFormat}
                  showMatchType={showMatchType}
                  t={t}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function ProviderMatchRow({
  dateTimeFormat,
  dayDateFormat,
  item,
  now,
  numberFormat,
  showMatchType,
  t,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly item: PlayerRecentProviderMatchDto;
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly showMatchType: boolean;
  readonly t: Translator;
}) {
  const { match } = item;
  const occurredAt = new Date(match.occurredAt);
  const mode = providerMatchMode(item);
  const typeLabel = showMatchType && mode ? t(matchTypeMessageKey(mode)) : null;
  const outcome = matchOutcome(item);
  const outcomeLabel = outcome === "unknown" ? null : t(matchOutcomeMessageKey(outcome));
  const feat = appearanceScoringFeat(item);
  const featLabel = feat ? t(scoringFeatMessageKey(feat)) : null;
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
  const dayKind = calendarDayKind(occurredAt, now);
  const whenLabel = `${dayHeading(dayKind, occurredAt, dayDateFormat, t)}, ${timeLabel}`;

  return (
    <li aria-label={accessibleName} className="relative">
      <div
        className={`relative flex min-h-52 flex-col overflow-hidden rounded-xl border border-border bg-surface ${
          playedAppearance(item) ? "pb-16" : ""
        }`}
      >
        <MatchPitchWash
          awayGoals={match.away.goals}
          awayImageUrl={match.away.imageUrl}
          homeGoals={match.home.goals}
          homeImageUrl={match.home.imageUrl}
        />
        <div className="relative flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-2">
            <MatchHeaderMeta
              items={[
                typeLabel && mode ? (
                  <Badge data-match-type={mode} key="type" variant={matchTypeBadgeVariant(mode)}>
                    {typeLabel}
                  </Badge>
                ) : null,
                outcomeLabel ? (
                  <span
                    className={`typo-caption font-semibold ${matchOutcomeToneClass(outcome)}`}
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
                  <span className="font-medium">{whenLabel}</span>
                </time>,
              ]}
            />
            <Button
              aria-label={t("player.matches.openMatch")}
              className="shrink-0"
              data-match-chevron=""
              dense
              size="icon"
              type="button"
              variant="ghost"
            >
              <CaretRightIcon />
            </Button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-10 sm:gap-16">
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
      </div>
      <MatchAppearanceStrip item={item} mvpLabel={mvpLabel} numberFormat={numberFormat} t={t} />
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

function pitchFillsForResult(result: "home" | "away" | "draw"): {
  readonly home: PitchHalfFill;
  readonly away: PitchHalfFill;
} {
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
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4 sm:bottom-4">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full bg-surface px-4 py-2.5 smooth-shadow-ring-sm">
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
          <span className="typo-caption">
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
            <span className="typo-caption">
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

function ViewRecord({
  numberFormat,
  record,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly record: MatchRecordSummary;
  readonly t: Translator;
}) {
  return (
    <StatGroup
      aria-label={t("player.matches.record.label")}
      className={RECORD_STAT_GRID_CLASS_NAME}
    >
      <RecordStatCard
        icon={TrophyIcon}
        label={t("player.matches.record.wins")}
        metric="record-wins"
      >
        <StatValue data-metric="record-wins">{numberFormat.format(record.wins)}</StatValue>
      </RecordStatCard>
      <RecordStatCard
        icon={EqualsIcon}
        label={t("player.matches.record.draws")}
        metric="record-draws"
      >
        <StatValue data-metric="record-draws">{numberFormat.format(record.draws)}</StatValue>
      </RecordStatCard>
      <RecordStatCard
        icon={TrendDownIcon}
        label={t("player.matches.record.losses")}
        metric="record-losses"
      >
        <StatValue data-metric="record-losses">{numberFormat.format(record.losses)}</StatValue>
      </RecordStatCard>
      <RecordStatCard icon={SoccerBallIcon} label={t("player.metric.goals")} metric="record-goals">
        <CompactMetricValue
          metric="record-goals"
          numberFormat={numberFormat}
          size="default"
          t={t}
          value={record.goals}
        />
      </RecordStatCard>
      <RecordStatCard
        icon={HandshakeIcon}
        label={t("player.metric.assists")}
        metric="record-assists"
      >
        <CompactMetricValue
          metric="record-assists"
          numberFormat={numberFormat}
          size="default"
          t={t}
          value={record.assists}
        />
      </RecordStatCard>
      <RecordStatCard
        icon={StarIcon}
        iconWeight="fill"
        label={t("player.metric.rating")}
        metric="record-rating"
      >
        <CompactMetricValue
          metric="record-rating"
          numberFormat={numberFormat}
          size="default"
          t={t}
          value={record.averageRating}
        />
      </RecordStatCard>
    </StatGroup>
  );
}

function RecordStatCard({
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
    <Card className="h-full min-w-0">
      <CardContent className="p-4">
        <Stat>
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
      </CardContent>
    </Card>
  );
}

function RecordLoading({ t }: { readonly t: Translator }) {
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
      <RecordLoadingCard />
      <RecordLoadingCard />
      <RecordLoadingCard />
    </div>
  );
}

function RecordLoadingCard() {
  return (
    <Card className="h-full min-w-0">
      <CardContent className="p-4">
        <Skeleton className="h-14 w-16" />
      </CardContent>
    </Card>
  );
}

function MatchesTabs({
  activeView,
  children,
  onViewChange,
  t,
}: {
  readonly activeView: PlayerMatchesView;
  readonly children: ReactNode;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly t: Translator;
}) {
  return (
    <Tabs
      aria-label={t("player.matches.view.label")}
      onValueChange={(value) => {
        if (isPlayerMatchesView(value)) onViewChange(value);
      }}
      value={activeView}
      variant="pills"
    >
      <TabsList>
        {PLAYER_MATCHES_VIEWS.map((view) => (
          <TabsTrigger key={view} value={view}>
            {t(viewTabKey(view))}
          </TabsTrigger>
        ))}
        <TabsIndicator />
      </TabsList>
      {children}
    </Tabs>
  );
}

function MatchesLoading({ label }: { readonly label: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      className="flex flex-col gap-6"
      role="status"
    >
      <p className="typo-caption text-muted-foreground">{label}</p>
      <div className="space-y-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}

function SectionError({
  message,
  onRetry,
  t,
}: {
  readonly message: string;
  readonly onRetry: () => void;
  readonly t: Translator;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        <Button onClick={onRetry} variant="secondary">
          {t("player.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function sectionStatus(query: {
  readonly isPending: boolean;
  readonly isError: boolean;
}): SectionStatus {
  if (query.isPending) return "pending";
  if (query.isError) return "error";
  return "ready";
}

type SectionStatus = "pending" | "error" | "ready";

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
    <div className="flex w-28 min-w-0 flex-col items-center gap-1 sm:w-36">
      <ClubCrestAvatar
        className="size-20 shrink-0 sm:size-24"
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

function matchOutcomeToneClass(outcome: MatchOutcome): string {
  switch (outcome) {
    case "win":
      return "text-primary";
    case "draw":
      return "text-[var(--amber-500)] dark:text-[var(--amber-300)]";
    case "loss":
      return "text-danger";
    case "unknown":
      return "text-muted-foreground";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
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

function CompactMetricValue({
  metric,
  numberFormat,
  size = "compact",
  t,
  value,
}: {
  readonly metric?: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly size?: "compact" | "default";
  readonly t: Translator;
  readonly value: number | null;
}) {
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

function viewTabKey(
  view: PlayerMatchesView,
):
  | "player.matches.view.recent"
  | "player.matches.view.league"
  | "player.matches.view.playoff"
  | "player.matches.view.friendly"
  | "player.matches.view.all" {
  switch (view) {
    case "recent":
      return "player.matches.view.recent";
    case "league":
      return "player.matches.view.league";
    case "playoff":
      return "player.matches.view.playoff";
    case "friendly":
      return "player.matches.view.friendly";
    case "all":
      return "player.matches.view.all";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

function matchTypeMessageKey(
  mode: ProviderMatchMode,
): "player.matches.type.league" | "player.matches.type.playoff" | "player.matches.type.friendly" {
  switch (mode) {
    case "leagueMatch":
      return "player.matches.type.league";
    case "playoffMatch":
      return "player.matches.type.playoff";
    case "friendlyMatch":
      return "player.matches.type.friendly";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function matchOutcomeMessageKey(
  outcome: Exclude<MatchOutcome, "unknown">,
): "player.matches.outcome.win" | "player.matches.outcome.draw" | "player.matches.outcome.loss" {
  switch (outcome) {
    case "win":
      return "player.matches.outcome.win";
    case "draw":
      return "player.matches.outcome.draw";
    case "loss":
      return "player.matches.outcome.loss";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

function scoringFeatMessageKey(
  feat: ScoringFeat,
): "player.matches.feat.hatTrick" | "player.matches.feat.poker" | "player.matches.feat.repoker" {
  switch (feat) {
    case "hatTrick":
      return "player.matches.feat.hatTrick";
    case "poker":
      return "player.matches.feat.poker";
    case "repoker":
      return "player.matches.feat.repoker";
    default: {
      const _exhaustive: never = feat;
      return _exhaustive;
    }
  }
}

function historyLabelKey(
  view: Exclude<PlayerMatchesView, "recent">,
):
  | "player.matches.all.historyLabel"
  | "player.matches.league.historyLabel"
  | "player.matches.playoff.historyLabel"
  | "player.matches.friendly.historyLabel" {
  switch (view) {
    case "all":
      return "player.matches.all.historyLabel";
    case "league":
      return "player.matches.league.historyLabel";
    case "playoff":
      return "player.matches.playoff.historyLabel";
    case "friendly":
      return "player.matches.friendly.historyLabel";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

function emptyTitleKey(
  view: Exclude<PlayerMatchesView, "recent">,
):
  | "player.matches.all.emptyTitle"
  | "player.matches.league.emptyTitle"
  | "player.matches.playoff.emptyTitle"
  | "player.matches.friendly.emptyTitle" {
  switch (view) {
    case "all":
      return "player.matches.all.emptyTitle";
    case "league":
      return "player.matches.league.emptyTitle";
    case "playoff":
      return "player.matches.playoff.emptyTitle";
    case "friendly":
      return "player.matches.friendly.emptyTitle";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

function emptyDescriptionKey(
  view: Exclude<PlayerMatchesView, "recent">,
):
  | "player.matches.all.emptyDescription"
  | "player.matches.league.emptyDescription"
  | "player.matches.playoff.emptyDescription"
  | "player.matches.friendly.emptyDescription" {
  switch (view) {
    case "all":
      return "player.matches.all.emptyDescription";
    case "league":
      return "player.matches.league.emptyDescription";
    case "playoff":
      return "player.matches.playoff.emptyDescription";
    case "friendly":
      return "player.matches.friendly.emptyDescription";
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

function formatCalendarDayHeading(occurredAt: Date, dateFormat: Intl.DateTimeFormat): string {
  const day = startOfLocalDay(occurredAt);
  const parts = dateFormat.formatToParts(day);
  const dayPart = parts.find((part) => part.type === "day")?.value;
  const monthPart = parts.find((part) => part.type === "month")?.value;
  const yearPart = parts.find((part) => part.type === "year")?.value;
  if (dayPart === undefined || monthPart === undefined || yearPart === undefined) {
    return dateFormat.format(day);
  }
  if (dateFormat.resolvedOptions().locale.startsWith("es")) {
    return `${dayPart} de ${monthPart} del ${yearPart}`;
  }
  return `${dayPart} ${monthPart} ${yearPart}`;
}

function dayHeading(
  kind: CalendarDayKind,
  occurredAt: Date,
  dateFormat: Intl.DateTimeFormat,
  t: Translator,
): string {
  switch (kind) {
    case "today":
      return t("player.matches.day.today");
    case "yesterday":
      return t("player.matches.day.yesterday");
    case "other":
      return formatCalendarDayHeading(occurredAt, dateFormat);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
