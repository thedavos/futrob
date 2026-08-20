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
  Card,
  CardContent,
  ChoiceGroup,
  ChoiceGroupItem,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
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
  MATCH_SORT_KEYS,
  VIEW_FILTER_KEYS,
} from "./player-match-copy.ts";
import { RecordLoading, ViewRecord } from "./player-match-record.tsx";
import { ProviderMatchRow } from "./player-match-row.tsx";
import {
  calendarDayKind,
  groupMatchesByDay,
  isMatchSortOrder,
  isPlayerMatchesView,
  MATCH_SORT_ORDERS,
  matchesForView,
  PLAYER_MATCHES_VIEWS,
  showsMatchTypeBadge,
  sortMatchesByOccurredAt,
  summarizeMatchRecord,
  type MatchDayGroup,
  type MatchSortOrder,
  type PlayerMatchesView,
} from "./player-match-view.ts";
import { useMyRecentMatchesQuery } from "./statistics-queries.ts";

export type { PlayerMatchesView };

type SectionStatus = "pending" | "error" | "ready";

export function PlayerMatchesPage({
  externalClubId: clubIdProp,
  now,
  onSortChange,
  onViewChange,
  sortOrder,
  view,
}: {
  readonly externalClubId?: string;
  readonly now?: Date;
  readonly onSortChange?: (order: MatchSortOrder) => void;
  readonly onViewChange?: (view: PlayerMatchesView) => void;
  readonly sortOrder?: MatchSortOrder;
  readonly view?: PlayerMatchesView;
}) {
  if (clubIdProp !== undefined) {
    return (
      <PlayerMatchesPageLoaded
        externalClubId={clubIdProp}
        now={now}
        onSortChange={onSortChange}
        onViewChange={onViewChange}
        profileReady
        sortOrder={sortOrder}
        view={view}
      />
    );
  }
  return (
    <PlayerMatchesFromWorkspace
      now={now}
      onSortChange={onSortChange}
      onViewChange={onViewChange}
      sortOrder={sortOrder}
      view={view}
    />
  );
}

function PlayerMatchesFromWorkspace({
  now,
  onSortChange,
  onViewChange,
  sortOrder,
  view,
}: {
  readonly now?: Date;
  readonly onSortChange?: (order: MatchSortOrder) => void;
  readonly onViewChange?: (view: PlayerMatchesView) => void;
  readonly sortOrder?: MatchSortOrder;
  readonly view?: PlayerMatchesView;
}) {
  const selectedClub = useWorkspaceSelectedClubId();
  return (
    <PlayerMatchesPageLoaded
      externalClubId={selectedClub.externalClubId}
      now={now}
      onSortChange={onSortChange}
      onViewChange={onViewChange}
      profileReady={selectedClub.profileReady}
      sortOrder={sortOrder}
      view={view}
    />
  );
}

function PlayerMatchesPageLoaded({
  externalClubId,
  now = new Date(),
  onSortChange,
  onViewChange,
  profileReady,
  sortOrder: sortOrderProp = "newest",
  view = "all",
}: {
  readonly externalClubId: string | undefined;
  readonly now?: Date;
  readonly onSortChange?: (order: MatchSortOrder) => void;
  readonly onViewChange?: (view: PlayerMatchesView) => void;
  readonly profileReady: boolean;
  readonly sortOrder?: MatchSortOrder;
  readonly view?: PlayerMatchesView;
}) {
  const { t, locale } = useI18n();
  const recentQuery = useMyRecentMatchesQuery(externalClubId, profileReady);
  const [addClubOpen, setAddClubOpen] = useState(false);
  const [uncontrolledView, setUncontrolledView] = useState<PlayerMatchesView>(view);
  const [uncontrolledSort, setUncontrolledSort] = useState<MatchSortOrder>(sortOrderProp);
  const activeView = onViewChange === undefined ? uncontrolledView : view;
  const sortOrder = onSortChange === undefined ? uncontrolledSort : sortOrderProp;
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

  function setSortOrder(next: MatchSortOrder) {
    if (onSortChange === undefined) {
      setUncontrolledSort(next);
      return;
    }
    onSortChange(next);
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
          onSortChange={setSortOrder}
          onViewChange={setActiveView}
          result={result}
          sortOrder={sortOrder}
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
  onSortChange,
  onViewChange,
  result,
  sortOrder,
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
  readonly onSortChange: (order: MatchSortOrder) => void;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly result: GetMyRecentMatchesResponse | undefined;
  readonly sortOrder: MatchSortOrder;
  readonly status: SectionStatus;
  readonly t: Translator;
}) {
  if (status === "pending") {
    return (
      <div className="space-y-8">
        <RecordLoading />
        <div className="flex flex-col gap-6">
          <MatchesToolbar
            activeView={activeView}
            onSortChange={onSortChange}
            onViewChange={onViewChange}
            sortOrder={sortOrder}
            t={t}
          />
          <MatchesLoading label={t("player.matches.loading")} />
        </div>
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
          onSortChange={onSortChange}
          onViewChange={onViewChange}
          sortOrder={sortOrder}
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
  onSortChange,
  onViewChange,
  sortOrder,
  t,
}: {
  readonly activeView: PlayerMatchesView;
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly matches: readonly PlayerRecentProviderMatchDto[];
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly onSortChange: (order: MatchSortOrder) => void;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly sortOrder: MatchSortOrder;
  readonly t: Translator;
}) {
  const visibleMatches = sortMatchesByOccurredAt(matchesForView(matches, activeView), sortOrder);
  const record = summarizeMatchRecord(visibleMatches);
  const groups = groupMatchesByDay(visibleMatches);

  return (
    <div className="space-y-8">
      {visibleMatches.length > 0 ? (
        <ViewRecord matches={visibleMatches} numberFormat={numberFormat} record={record} />
      ) : null}
      <div className="flex flex-col gap-6">
        <MatchesToolbar
          activeView={activeView}
          onSortChange={onSortChange}
          onViewChange={onViewChange}
          resultCount={visibleMatches.length}
          sortOrder={sortOrder}
          t={t}
        />
        <MatchDayLists
          dateTimeFormat={dateTimeFormat}
          dayDateFormat={dayDateFormat}
          emptyDescription={t(EMPTY_DESCRIPTION_KEYS[activeView])}
          emptyTitle={t(EMPTY_TITLE_KEYS[activeView])}
          groups={groups}
          historyLabel={t(HISTORY_LABEL_KEYS[activeView])}
          now={now}
          numberFormat={numberFormat}
          sortOrder={sortOrder}
          showMatchType={showsMatchTypeBadge(activeView)}
          t={t}
          view={activeView}
        />
      </div>
    </div>
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
  sortOrder,
  showMatchType,
  t,
  view,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly emptyDescription: string;
  readonly emptyTitle: string;
  readonly groups: readonly MatchDayGroup[];
  readonly historyLabel: string;
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly sortOrder: MatchSortOrder;
  readonly showMatchType: boolean;
  readonly t: Translator;
  readonly view: PlayerMatchesView;
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
                  sortOrder={sortOrder}
                  showMatchType={showMatchType}
                  t={t}
                  view={view}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function MatchesToolbar({
  activeView,
  onSortChange,
  onViewChange,
  resultCount,
  sortOrder,
  t,
}: {
  readonly activeView: PlayerMatchesView;
  readonly onSortChange: (order: MatchSortOrder) => void;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly resultCount?: number;
  readonly sortOrder: MatchSortOrder;
  readonly t: Translator;
}) {
  return (
    <Card className="@container">
      <CardContent className="flex flex-col gap-4 px-4 py-3 @3xl:flex-row @3xl:items-center @3xl:gap-x-4 @3xl:gap-y-2">
        <ChoiceGroup<PlayerMatchesView>
          aria-label={t("player.matches.view.label")}
          className="grid min-w-0 grid-cols-2 gap-2 @xl:flex @xl:flex-wrap"
          onValueChange={(value) => {
            if (isPlayerMatchesView(value)) onViewChange(value);
          }}
          value={activeView}
        >
          {PLAYER_MATCHES_VIEWS.map((view) => (
            <ChoiceGroupItem
              appearance="pill"
              className="w-full rounded-lg border-border-strong px-4 font-semibold data-[checked]:border-transparent data-[checked]:bg-primary data-[checked]:text-primary-foreground data-[checked]:hover:bg-primary-hover @xl:w-auto min-h-(--control-height-dense) max-sm:min-h-(--control-height-touch)"
              key={view}
              value={view}
            >
              {t(VIEW_FILTER_KEYS[view])}
            </ChoiceGroupItem>
          ))}
        </ChoiceGroup>
        <Separator className="hidden h-8 @3xl:block" orientation="vertical" />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <Select
            itemToStringLabel={(value) =>
              isMatchSortOrder(value) ? t(MATCH_SORT_KEYS[value]) : ""
            }
            items={MATCH_SORT_ORDERS.map((order) => ({
              label: t(MATCH_SORT_KEYS[order]),
              value: order,
            }))}
            onValueChange={(value) => {
              if (isMatchSortOrder(value)) onSortChange(value);
            }}
            value={sortOrder}
          >
            <SelectTrigger
              aria-label={t("player.matches.sort.label")}
              className="w-max min-w-40 max-w-full"
              dense
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {MATCH_SORT_ORDERS.map((order) => (
                <SelectItem key={order} value={order}>
                  {t(MATCH_SORT_KEYS[order])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resultCount === undefined ? null : (
            <p
              className="typo-caption shrink-0 font-medium whitespace-nowrap tabular-nums text-muted-foreground"
              role="status"
            >
              {t("player.matches.results.count", { count: resultCount })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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
