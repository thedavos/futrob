"use client";

import { useState, type ReactNode } from "react";
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
import {
  calendarDayKind,
  filterRecentMatches,
  groupMatchesByDay,
  isDnfMatch,
  isPlayerMatchesView,
  matchesForView,
  matchMvpDisplayName,
  matchOutcome,
  PLAYER_MATCHES_VIEWS,
  playerMatchSide,
  providerMatchMode,
  scoringFeat,
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
const RECORD_STAT_GRID_CLASS_NAME = "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6";

export function PlayerMatchesPage({
  now = new Date(),
  onViewChange,
  view = "recent",
}: {
  readonly now?: Date;
  readonly onViewChange?: (view: PlayerMatchesView) => void;
  readonly view?: PlayerMatchesView;
}) {
  const { t, locale } = useI18n();
  const recentQuery = useMyRecentMatchesQuery();
  const [addClubOpen, setAddClubOpen] = useState(false);
  const [uncontrolledView, setUncontrolledView] = useState<PlayerMatchesView>(view);
  const activeView = onViewChange === undefined ? uncontrolledView : view;
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 2,
  });
  const dateTimeFormat = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
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
          <MatchesLoading label={t("player.matches.loading")} />
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
            <ol className="divide-y divide-border-subtle rounded-lg border border-border bg-surface">
              {group.matches.map((item) => (
                <ProviderMatchRow
                  dateTimeFormat={dateTimeFormat}
                  item={item}
                  key={`${item.match.provider.key}:${item.match.provider.externalMatchId}`}
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
  item,
  numberFormat,
  showMatchType,
  t,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly item: PlayerRecentProviderMatchDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly showMatchType: boolean;
  readonly t: Translator;
}) {
  const { match, appearance } = item;
  const occurredAt = new Date(match.occurredAt);
  const mode = providerMatchMode(item);
  const typeLabel = showMatchType && mode ? t(matchTypeMessageKey(mode)) : null;
  const outcome = matchOutcome(item);
  const outcomeLabel = outcome === "unknown" ? null : t(matchOutcomeMessageKey(outcome));
  const feat = scoringFeat(appearance.goals);
  const featLabel = feat ? t(scoringFeatMessageKey(feat)) : null;
  const featScorerName = scoringFeatPlayerName(item);
  const mvpName = matchMvpDisplayName(item);
  const mvpLabel = mvpName ? t("player.matches.mvp.named", { name: mvpName }) : null;
  const dnf = isDnfMatch(item);
  const showYellow = showsYellowCards(appearance.yellowCards);
  const showRed = showsRedCards(appearance.redCards);
  const side = playerMatchSide(item);
  const accessibleName = [
    match.home.name,
    String(match.home.goals),
    t("player.matches.vs"),
    String(match.away.goals),
    match.away.name,
    typeLabel,
    outcomeLabel,
    dnf ? t("player.matches.dnf") : null,
    featLabel,
    mvpLabel,
    showRed && appearance.redCards !== null
      ? `${t("player.matches.metric.redCards")} ${appearance.redCards}`
      : null,
    dateTimeFormat.format(occurredAt),
  ]
    .filter((part): part is string => part !== null)
    .join(" ");

  const typeBadge =
    typeLabel && mode ? (
      <Badge data-match-type={mode} variant={matchTypeBadgeVariant(mode)}>
        {typeLabel}
      </Badge>
    ) : null;
  const dnfBadge = dnf ? (
    <Badge
      aria-label={t("player.matches.dnf")}
      data-match-dnf=""
      title={t("player.matches.dnf")}
      variant="outline"
    >
      <PlugsIcon aria-hidden="true" />
    </Badge>
  ) : null;
  const accoladeBadges = (
    <>
      {featLabel && feat ? (
        <ScoringFeatBadge feat={feat} featLabel={featLabel} scorerName={featScorerName} t={t} />
      ) : null}
      {mvpLabel ? (
        <Badge>
          <StarIcon aria-hidden="true" weight="fill" />
          {mvpLabel}
        </Badge>
      ) : null}
    </>
  );
  const hasAccolades = Boolean(featLabel || mvpLabel);
  const hasMatchHeader = Boolean(typeBadge || dnfBadge);

  return (
    <li aria-label={accessibleName} className="px-4 py-5 sm:px-5">
      {hasMatchHeader ? (
        <div className="mb-4 flex items-center gap-2">
          {typeBadge}
          {dnfBadge}
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        <div className="flex justify-center">
          <ClubCrestAvatar
            className="size-12"
            fallbackClassName="text-xs"
            imageUrl={match.home.imageUrl}
            name={match.home.name}
          />
        </div>
        <div
          className={`col-start-2 row-span-2 flex items-center justify-center gap-2 ${matchOutcomeScoreClass(outcome)}`}
          data-match-outcome={outcome === "unknown" ? undefined : outcome}
        >
          <span className="typo-score tabular-nums">{match.home.goals}</span>
          <span className="typo-caption px-0.5 font-semibold leading-none">
            {t("player.matches.vs")}
          </span>
          <span className="typo-score tabular-nums">{match.away.goals}</span>
        </div>
        <div className="flex justify-center">
          <ClubCrestAvatar
            className="size-12"
            fallbackClassName="text-xs"
            imageUrl={match.away.imageUrl}
            name={match.away.name}
          />
        </div>
        <MatchClubMeta
          column="home"
          name={match.home.name}
          redCards={side === "home" ? appearance.redCards : null}
          redCardsLabel={t("player.matches.metric.redCards")}
        />
        <MatchClubMeta
          column="away"
          name={match.away.name}
          redCards={side === "away" ? appearance.redCards : null}
          redCardsLabel={t("player.matches.metric.redCards")}
        />
      </div>

      {hasAccolades ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {accoladeBadges}
        </div>
      ) : null}

      <StatGroup
        className={
          showYellow
            ? "mt-5 grid w-full grid-cols-4 items-end gap-x-3 [&>[data-slot=stat]]:min-w-0"
            : "mt-5 grid w-full grid-cols-3 items-end gap-x-3 [&>[data-slot=stat]]:min-w-0"
        }
      >
        <MatchStat
          icon={SoccerBallIcon}
          label={t("player.metric.goals")}
          metric="recent-goals"
          numberFormat={numberFormat}
          t={t}
          value={appearance.goals}
        />
        <MatchStat
          icon={HandshakeIcon}
          label={t("player.metric.assists")}
          metric="recent-assists"
          numberFormat={numberFormat}
          t={t}
          value={appearance.assists}
        />
        <MatchStat
          icon={StarIcon}
          iconWeight="fill"
          label={t("player.metric.rating")}
          metric="recent-rating"
          numberFormat={numberFormat}
          t={t}
          value={appearance.rating}
        />
        {showYellow ? (
          <MatchStat
            icon={RectangleIcon}
            iconClassName="size-3.5 rotate-90 text-warning"
            iconWeight="fill"
            label={t("player.matches.metric.yellowCards")}
            metric="recent-yellow"
            numberFormat={numberFormat}
            t={t}
            value={appearance.yellowCards}
          />
        ) : null}
      </StatGroup>
    </li>
  );
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
    <Card className="min-w-0">
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
    <Card className="min-w-0">
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
    <div aria-busy="true" aria-live="polite" aria-label={label} className="space-y-3" role="status">
      <p className="typo-caption text-muted-foreground">{label}</p>
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
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

function MatchClubMeta({
  column,
  name,
  redCards,
  redCardsLabel,
}: {
  readonly column: "home" | "away";
  readonly name: string;
  readonly redCards: number | null;
  readonly redCardsLabel: string;
}) {
  const showRed = showsRedCards(redCards);

  return (
    <div
      className={`${matchClubColumnClass(column)} flex min-w-0 w-full flex-col items-center gap-0.5`}
    >
      <p className="typo-caption min-w-0 w-full truncate text-center font-semibold text-muted-foreground">
        {name}
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

function matchClubColumnClass(column: "home" | "away"): "col-start-1" | "col-start-3" {
  switch (column) {
    case "home":
      return "col-start-1";
    case "away":
      return "col-start-3";
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
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

function MatchStat({
  icon: MetricIcon,
  iconClassName = "size-3.5",
  iconWeight = "regular",
  label,
  metric,
  numberFormat,
  t,
  value,
}: {
  readonly icon: Icon;
  readonly iconClassName?: string;
  readonly iconWeight?: IconWeight;
  readonly label: string;
  readonly metric: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
  readonly value: number | null;
}) {
  return (
    <Stat align="center">
      <StatLabel className="flex items-center justify-center gap-1">
        <MetricIcon
          aria-hidden="true"
          className={iconClassName}
          data-metric-icon={metric}
          weight={iconWeight}
        />
        {label}
      </StatLabel>
      <CompactMetricValue metric={metric} numberFormat={numberFormat} t={t} value={value} />
    </Stat>
  );
}

function matchOutcomeScoreClass(outcome: MatchOutcome): string {
  switch (outcome) {
    case "win":
      return "text-primary";
    case "draw":
      return "text-muted-foreground";
    case "loss":
      return "text-danger";
    case "unknown":
      return "text-foreground";
    default: {
      const _exhaustive: never = outcome;
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
    <StatValue data-metric={metric} size={size} tone={value === null ? "muted" : "default"}>
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
