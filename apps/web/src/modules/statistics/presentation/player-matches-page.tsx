"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type {
  GetMyRecentMatchesResponse,
  PlayerMatchContributionDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
} from "@futrob/ui";
import { GameControllerIcon, SoccerBallIcon, TrophyIcon } from "@phosphor-icons/react";
import { AddClubDialog } from "@/modules/teams/presentation/add-club-dialog.tsx";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useMyMatchesQuery, useMyRecentMatchesQuery } from "./statistics-queries.ts";

export function PlayerMatchesPage() {
  const { t, locale } = useI18n();
  const matchesQuery = useMyMatchesQuery();
  const recentQuery = useMyRecentMatchesQuery();
  const [addClubOpen, setAddClubOpen] = useState(false);
  const matches = matchesQuery.data?.pages.flatMap((page) => page.matches) ?? [];
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 2,
  });
  const dateTimeFormat = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="w-full max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader t={t} />

      <div className="space-y-12">
        <RecentMatchesSection
          dateTimeFormat={dateTimeFormat}
          numberFormat={numberFormat}
          onAddClub={() => setAddClubOpen(true)}
          onRetry={() => void recentQuery.refetch()}
          result={recentQuery.data}
          status={sectionStatus(recentQuery)}
          t={t}
        />
        <OfficialMatchesSection
          hasNextPage={matchesQuery.hasNextPage}
          isFetchingNextPage={matchesQuery.isFetchingNextPage}
          matches={matches}
          numberFormat={numberFormat}
          onLoadMore={() => void matchesQuery.fetchNextPage()}
          onRetry={() => void matchesQuery.refetch()}
          status={sectionStatus(matchesQuery)}
          t={t}
        />
      </div>

      <AddClubDialog onOpenChange={setAddClubOpen} open={addClubOpen} />
    </main>
  );
}

function PageHeader({ t }: { readonly t: Translator }) {
  return (
    <div className="mb-8">
      <h1 className="typo-heading">{t("player.matches.title")}</h1>
    </div>
  );
}

function RecentMatchesSection({
  dateTimeFormat,
  numberFormat,
  onAddClub,
  onRetry,
  result,
  status,
  t,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly numberFormat: Intl.NumberFormat;
  readonly onAddClub: () => void;
  readonly onRetry: () => void;
  readonly result: GetMyRecentMatchesResponse | undefined;
  readonly status: SectionStatus;
  readonly t: Translator;
}) {
  return (
    <section className="space-y-6">
      <h2 className="typo-label text-muted-foreground">{t("player.matches.recent.title")}</h2>
      {status === "pending" ? (
        <MatchesLoading label={t("player.matches.recent.loading")} />
      ) : status === "error" ? (
        <SectionError message={t("player.matches.recent.error")} onRetry={onRetry} t={t} />
      ) : result === undefined ? null : (
        <RecentMatchesBody
          dateTimeFormat={dateTimeFormat}
          numberFormat={numberFormat}
          onAddClub={onAddClub}
          result={result}
          t={t}
        />
      )}
    </section>
  );
}

function RecentMatchesBody({
  dateTimeFormat,
  numberFormat,
  onAddClub,
  result,
  t,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly numberFormat: Intl.NumberFormat;
  readonly onAddClub: () => void;
  readonly result: GetMyRecentMatchesResponse;
  readonly t: Translator;
}) {
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
      if (result.matches.length === 0) {
        return (
          <EmptyState className="min-h-0">
            <EmptyStateIcon>
              <SoccerBallIcon aria-hidden="true" />
            </EmptyStateIcon>
            <EmptyStateTitle>{t("player.matches.recent.emptyTitle")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("player.matches.recent.emptyDescription")}
            </EmptyStateDescription>
          </EmptyState>
        );
      }
      return (
        <ol
          aria-label={t("player.matches.recent.historyLabel")}
          className="divide-y divide-border-subtle rounded-lg border border-border bg-surface"
        >
          {result.matches.map((item) => (
            <RecentMatchRow
              dateTimeFormat={dateTimeFormat}
              item={item}
              key={`${item.match.provider.key}:${item.match.provider.externalMatchId}`}
              numberFormat={numberFormat}
              t={t}
            />
          ))}
        </ol>
      );
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function RecentMatchRow({
  dateTimeFormat,
  item,
  numberFormat,
  t,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly item: PlayerRecentProviderMatchDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const { match, appearance } = item;

  return (
    <li className="px-4 py-5 sm:px-5">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex min-w-0 items-center gap-2">
            <ClubCrestAvatar
              className="size-8"
              imageUrl={match.home.imageUrl}
              name={match.home.name}
            />
            <span className="truncate font-semibold">{match.home.name}</span>
          </span>
          <span className="tabular-nums font-semibold">
            {match.home.goals}–{match.away.goals}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <ClubCrestAvatar
              className="size-8"
              imageUrl={match.away.imageUrl}
              name={match.away.name}
            />
            <span className="truncate font-semibold">{match.away.name}</span>
          </span>
        </div>
        <p className="typo-caption mt-1 text-muted-foreground">
          {dateTimeFormat.format(new Date(match.occurredAt))} · {appearance.displayName}
        </p>
      </div>

      <StatGroup className="mt-5">
        <Stat>
          <StatLabel>{t("player.metric.goals")}</StatLabel>
          <CompactMetricValue
            metric="recent-goals"
            numberFormat={numberFormat}
            t={t}
            value={appearance.goals}
          />
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.assists")}</StatLabel>
          <CompactMetricValue
            metric="recent-assists"
            numberFormat={numberFormat}
            t={t}
            value={appearance.assists}
          />
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.rating")}</StatLabel>
          <CompactMetricValue
            metric="recent-rating"
            numberFormat={numberFormat}
            t={t}
            value={appearance.rating}
          />
        </Stat>
      </StatGroup>
    </li>
  );
}

function OfficialMatchesSection({
  hasNextPage,
  isFetchingNextPage,
  matches,
  numberFormat,
  onLoadMore,
  onRetry,
  status,
  t,
}: {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly matches: readonly PlayerMatchContributionDto[];
  readonly numberFormat: Intl.NumberFormat;
  readonly onLoadMore: () => void;
  readonly onRetry: () => void;
  readonly status: SectionStatus;
  readonly t: Translator;
}) {
  return (
    <section className="space-y-6">
      <h2 className="typo-label text-muted-foreground">{t("player.matches.official.title")}</h2>
      {status === "pending" ? (
        <MatchesLoading label={t("player.matches.official.loading")} />
      ) : status === "error" ? (
        <SectionError message={t("player.matches.official.error")} onRetry={onRetry} t={t} />
      ) : matches.length === 0 ? (
        <EmptyState className="min-h-0">
          <EmptyStateIcon>
            <TrophyIcon aria-hidden="true" />
          </EmptyStateIcon>
          <EmptyStateTitle>{t("player.matches.emptyTitle")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("player.matches.official.emptyDescription")}
          </EmptyStateDescription>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <ol
            aria-busy={isFetchingNextPage || undefined}
            aria-label={t("player.matches.historyLabel")}
            className="divide-y divide-border-subtle rounded-lg border border-border bg-surface"
          >
            {matches.map((match) => (
              <MatchContributionRow
                key={match.id}
                match={match}
                numberFormat={numberFormat}
                t={t}
              />
            ))}
          </ol>
          {hasNextPage ? (
            <Button disabled={isFetchingNextPage} onClick={onLoadMore} variant="secondary">
              {t(
                isFetchingNextPage ? "player.matches.loadMore.loading" : "player.matches.loadMore",
              )}
            </Button>
          ) : null}
        </div>
      )}
    </section>
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

function MatchContributionRow({
  match,
  numberFormat,
  t,
}: {
  readonly match: PlayerMatchContributionDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const isPartial =
    match.correlationStatus !== "matched" ||
    [
      match.minutesPlayed,
      match.goals,
      match.assists,
      match.shots,
      match.passAttempts,
      match.passesMade,
      match.tackleAttempts,
      match.tacklesMade,
      match.saves,
      match.yellowCards,
      match.redCards,
      match.isMvp,
      match.rating,
    ].some((value) => value === null);

  return (
    <li className="px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{match.displayName}</p>
          <p className="typo-caption mt-1 text-muted-foreground">
            {match.gameEdition} · {platformLabel(match.platform)}
          </p>
          <p className="typo-caption mt-1 text-muted-foreground">
            {match.position ?? t("player.position.unknown")} ·{" "}
            {formatNullable(match.minutesPlayed, numberFormat, t, "min")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="approved">{t("player.matches.official.badge")}</Badge>
          {isPartial ? (
            <Badge variant="warning">{t("player.partialData")}</Badge>
          ) : (
            <Badge>{t("player.completeData")}</Badge>
          )}
        </div>
      </div>

      <StatGroup className="mt-5">
        <Stat>
          <StatLabel>{t("player.metric.goals")}</StatLabel>
          <CompactMetricValue
            metric="goals"
            numberFormat={numberFormat}
            t={t}
            value={match.goals}
          />
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.assists")}</StatLabel>
          <CompactMetricValue
            metric="assists"
            numberFormat={numberFormat}
            t={t}
            value={match.assists}
          />
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.shots")}</StatLabel>
          <CompactMetricValue numberFormat={numberFormat} t={t} value={match.shots} />
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.saves")}</StatLabel>
          <CompactMetricValue numberFormat={numberFormat} t={t} value={match.saves} />
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.rating")}</StatLabel>
          <CompactMetricValue numberFormat={numberFormat} t={t} value={match.rating} />
        </Stat>
      </StatGroup>
    </li>
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

function CompactMetricValue({
  metric,
  numberFormat,
  t,
  value,
}: {
  readonly metric?: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
  readonly value: number | null;
}) {
  return (
    <StatValue data-metric={metric} size="compact" tone={value === null ? "muted" : "default"}>
      {formatNullable(value, numberFormat, t)}
    </StatValue>
  );
}

function formatNullable(
  value: number | null,
  numberFormat: Intl.NumberFormat,
  t: Translator,
  suffix = "",
): string {
  if (value === null) return t("player.noData");
  const formatted = numberFormat.format(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function platformLabel(platform: string): string {
  const labels: Readonly<Record<string, string>> = {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  };
  return labels[platform] ?? platform;
}
