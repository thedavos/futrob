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
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from "@futrob/ui";
import { GameControllerIcon, SoccerBallIcon } from "@phosphor-icons/react";
import { AddClubDialog } from "@/modules/teams/presentation/add-club-dialog.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useWorkspaceSelectedClubId } from "@/shared/presentation/shell/use-workspace-selection.tsx";
import {
  dayHeading,
  EMPTY_DESCRIPTION_KEYS,
  EMPTY_TITLE_KEYS,
  HISTORY_LABEL_KEYS,
  VIEW_TAB_KEYS,
} from "./player-match-copy.ts";
import { RecordLoading, ViewRecord } from "./player-match-record.tsx";
import { ProviderMatchRow } from "./player-match-row.tsx";
import {
  calendarDayKind,
  filterRecentMatches,
  groupMatchesByDay,
  isPlayerMatchesView,
  matchesForView,
  PLAYER_MATCHES_VIEWS,
  showsMatchTypeBadge,
  summarizeMatchRecord,
  type MatchDayGroup,
  type PlayerMatchesView,
} from "./player-match-view.ts";
import { useMyRecentMatchesQuery } from "./statistics-queries.ts";

export type { PlayerMatchesView };

type SectionStatus = "pending" | "error" | "ready";

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
        <RecordLoading />
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
        <MatchesEmpty
          actions={<Button onClick={onAddClub}>{t("shell.workspace.addClub")}</Button>}
          description={t("player.matches.recent.needsClub.description")}
          title={t("player.matches.recent.needsClub.title")}
        />
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
        <ViewRecord matches={visibleMatches} numberFormat={numberFormat} record={record} />
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
                  emptyDescription={t(EMPTY_DESCRIPTION_KEYS[view])}
                  emptyTitle={t(EMPTY_TITLE_KEYS[view])}
                  groups={groups}
                  historyLabel={t(HISTORY_LABEL_KEYS[view])}
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
      <MatchesEmpty
        actions={
          <Button onClick={onShowAll} variant="secondary">
            {t("player.matches.recent.emptyOlder.action")}
          </Button>
        }
        description={t("player.matches.recent.emptyOlder.description")}
        title={t("player.matches.recent.emptyOlder.title")}
      />
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
    return <MatchesEmpty description={emptyDescription} title={emptyTitle} />;
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
            {t(VIEW_TAB_KEYS[view])}
          </TabsTrigger>
        ))}
        <TabsIndicator />
      </TabsList>
      {children}
    </Tabs>
  );
}

function MatchesEmpty({
  actions,
  description,
  title,
}: {
  readonly actions?: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <EmptyState className="min-h-0">
      <EmptyStateIcon>
        <SoccerBallIcon aria-hidden="true" />
      </EmptyStateIcon>
      <EmptyStateTitle>{title}</EmptyStateTitle>
      <EmptyStateDescription>{description}</EmptyStateDescription>
      {actions ? <EmptyStateActions>{actions}</EmptyStateActions> : null}
    </EmptyState>
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
