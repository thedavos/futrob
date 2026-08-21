"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type {
  PlayerRecentProviderMatchDetailDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from "@futrob/ui";
import { GameControllerIcon, SoccerBallIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProviderMatchRow } from "./player-match-row.tsx";
import { type MatchSortOrder, type PlayerMatchesView } from "./player-match-view.ts";
import { MatchFacts } from "./provider-match-detail-facts.tsx";
import { listedMatchFromDetail, providerMatchDetailModel } from "./provider-match-detail-model.ts";
import { MatchRosters } from "./provider-match-detail-rosters.tsx";
import { MatchDetailSummary } from "./provider-match-detail-summary.tsx";

export type ProviderMatchDetailViewState =
  | {
      readonly kind: "loading";
      readonly summary?: PlayerRecentProviderMatchDto;
    }
  | { readonly kind: "needs_club" }
  | { readonly kind: "needs_game_account" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly detail: PlayerRecentProviderMatchDetailDto };

export function ProviderMatchDetailView({
  sort,
  state,
  view,
}: {
  readonly sort: MatchSortOrder;
  readonly state: ProviderMatchDetailViewState;
  readonly view: PlayerMatchesView;
}) {
  const { locale, t } = useI18n();
  const dateTimeFormat = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    hourCycle: "h23",
  });
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 2,
  });
  const listed = listedItemFromState(state);
  const pageLabel = matchCrumbLabel(listed, t);

  return (
    <TooltipProvider>
      <main className="w-full space-y-6">
        <header className="space-y-4">
          {listed ? <h1 className="sr-only">{pageLabel}</h1> : null}
          <MatchDetailBreadcrumb pageLabel={pageLabel} sort={sort} t={t} view={view} />
          {listed ? (
            <MatchScoreboard
              dateTimeFormat={dateTimeFormat}
              item={listed}
              numberFormat={numberFormat}
              sort={sort}
              t={t}
              view={view}
            />
          ) : state.kind === "loading" ? (
            <Skeleton className="min-h-52 w-full rounded-xl" />
          ) : null}
        </header>
        <MatchDetailBody numberFormat={numberFormat} state={state} t={t} />
      </main>
    </TooltipProvider>
  );
}

function MatchDetailBreadcrumb({
  pageLabel,
  sort,
  t,
  view,
}: {
  readonly pageLabel: string;
  readonly sort: MatchSortOrder;
  readonly t: Translator;
  readonly view: PlayerMatchesView;
}) {
  return (
    <Breadcrumb aria-label={t("player.matchDetail.breadcrumb")}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link search={{ sort, view }} to="/player/matches" />}>
            {t("player.nav.matches")}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function MatchScoreboard({
  dateTimeFormat,
  item,
  numberFormat,
  sort,
  t,
  view,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly item: PlayerRecentProviderMatchDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly sort: MatchSortOrder;
  readonly t: Translator;
  readonly view: PlayerMatchesView;
}) {
  return (
    <ol className="m-0 list-none p-0">
      <ProviderMatchRow
        dateTimeFormat={dateTimeFormat}
        item={item}
        numberFormat={numberFormat}
        showAppearanceStrip={false}
        showMatchType
        showOpenMatch={false}
        sortOrder={sort}
        t={t}
        view={view}
      />
    </ol>
  );
}

function MatchDetailBody({
  numberFormat,
  state,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly state: ProviderMatchDetailViewState;
  readonly t: Translator;
}) {
  switch (state.kind) {
    case "loading":
      return <RosterLoading t={t} />;
    case "needs_club":
      return (
        <DetailEmptyState
          action={
            <Button render={<Link to="/player/ea-clubs" />} role="link">
              {t("shell.workspace.addClub")}
            </Button>
          }
          description={t("player.matchDetail.needsClub.description")}
          icon={<SoccerBallIcon aria-hidden="true" />}
          title={t("player.matchDetail.needsClub.title")}
        />
      );
    case "needs_game_account":
      return (
        <DetailEmptyState
          action={
            <Button render={<Link to="/player/game-accounts" />} role="link">
              {t("player.gameData.review")}
            </Button>
          }
          description={t("player.matchDetail.needsGameAccount.description")}
          icon={<GameControllerIcon aria-hidden="true" />}
          title={t("player.matchDetail.needsGameAccount.title")}
        />
      );
    case "not_found":
      return (
        <DetailEmptyState
          description={t("player.matchDetail.notFound.description")}
          icon={<SoccerBallIcon aria-hidden="true" />}
          title={t("player.matchDetail.notFound.title")}
        />
      );
    case "error":
      return (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("player.matchDetail.error")}</span>
            <Button onClick={state.retry} variant="secondary">
              {t("common.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      );
    case "ready": {
      const model = providerMatchDetailModel(state.detail);
      return (
        <Tabs defaultValue="summary" variant="pills">
          <TabsList className="w-fit max-w-full">
            <TabsTrigger value="summary">{t("player.matchDetail.tab.summary")}</TabsTrigger>
            <TabsTrigger value="players">{t("player.matchDetail.tab.players")}</TabsTrigger>
            <TabsTrigger value="facts">{t("player.matchDetail.tab.facts")}</TabsTrigger>
          </TabsList>
          <TabsContent className="pt-6" value="summary">
            <MatchDetailSummary model={model} numberFormat={numberFormat} t={t} />
          </TabsContent>
          <TabsContent className="pt-6" value="players">
            <MatchRosters numberFormat={numberFormat} sides={model.sides} t={t} />
          </TabsContent>
          <TabsContent className="pt-6" value="facts">
            <MatchFacts detail={state.detail} t={t} />
          </TabsContent>
        </Tabs>
      );
    }
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function RosterLoading({ t }: { readonly t: Translator }) {
  return (
    <div
      aria-busy="true"
      aria-label={t("player.matchDetail.loading")}
      className="space-y-8"
      role="status"
    >
      <p className="typo-caption text-muted-foreground">{t("player.matchDetail.loading")}</p>
      {[0, 1].map((section) => (
        <div className="space-y-3" key={section}>
          <Skeleton className="h-10 w-48 max-w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ))}
    </div>
  );
}

function DetailEmptyState({
  action,
  description,
  icon,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly icon: ReactNode;
  readonly title: string;
}) {
  return (
    <EmptyState className="min-h-0">
      <EmptyStateIcon>{icon}</EmptyStateIcon>
      <EmptyStateTitle>{title}</EmptyStateTitle>
      <EmptyStateDescription>{description}</EmptyStateDescription>
      {action ? <EmptyStateActions>{action}</EmptyStateActions> : null}
    </EmptyState>
  );
}

function listedItemFromState(
  state: ProviderMatchDetailViewState,
): PlayerRecentProviderMatchDto | undefined {
  switch (state.kind) {
    case "ready":
      return listedMatchFromDetail(state.detail);
    case "loading":
      return state.summary;
    case "needs_club":
    case "needs_game_account":
    case "not_found":
    case "error":
      return undefined;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function matchCrumbLabel(item: PlayerRecentProviderMatchDto | undefined, t: Translator): string {
  if (!item) return t("player.matchDetail.breadcrumb.match");
  return `${item.match.home.name} ${t("player.matchDetail.vs")} ${item.match.away.name}`;
}
