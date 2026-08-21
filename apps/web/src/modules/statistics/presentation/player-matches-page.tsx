"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { GetMyRecentMatchesResponse } from "@futrob/api-contracts";
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  TooltipProvider,
} from "@futrob/ui";
import { GameControllerIcon } from "@phosphor-icons/react";
import { AddClubDialog } from "@/modules/teams/presentation/add-club-dialog.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useWorkspaceSelectedClubId } from "@/shared/presentation/shell/use-workspace-selection.tsx";
import {} from "./player-match-copy.ts";
import { RecordLoading } from "./player-match-record.tsx";
import type { MatchSortOrder, PlayerMatchesView } from "./player-match-view.ts";
import { useMyRecentMatchesQuery } from "./statistics-queries.ts";
import {
  MatchesEmpty,
  MatchesLoading,
  MatchesToolbar,
  ReadyMatches,
  SectionError,
  sectionStatus,
} from "./player-matches-list.tsx";
import type { SectionStatus } from "./player-matches-list.tsx";

export type { PlayerMatchesView };

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
