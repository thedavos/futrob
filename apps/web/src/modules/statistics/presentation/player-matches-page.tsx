"use client";

import { Link } from "@tanstack/react-router";
import type { PlayerMatchContributionDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useMyMatchesQuery } from "./statistics-queries.ts";

export function PlayerMatchesPage() {
  const { t, locale } = useI18n();
  const matchesQuery = useMyMatchesQuery();
  const matches = matchesQuery.data?.pages.flatMap((page) => page.matches) ?? [];
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 2,
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader t={t} />

      {matchesQuery.isPending ? (
        <MatchesLoading t={t} />
      ) : matchesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("player.matches.error")}</span>
            <Button onClick={() => void matchesQuery.refetch()} variant="secondary">
              {t("player.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : matches.length === 0 ? (
        <OfficialHistoryEmpty t={t} />
      ) : (
        <div className="space-y-4">
          <ol
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
          {matchesQuery.hasNextPage ? (
            <Button
              disabled={matchesQuery.isFetchingNextPage}
              onClick={() => void matchesQuery.fetchNextPage()}
              variant="secondary"
            >
              {t("player.matches.loadMore")}
            </Button>
          ) : null}
        </div>
      )}
    </main>
  );
}

function PageHeader({ t }: { readonly t: Translator }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <p className="typo-label text-muted-foreground">{t("player.workspace.eyebrow")}</p>
        <h1 className="typo-heading">{t("player.matches.title")}</h1>
        <p className="typo-subtitle text-muted-foreground">{t("player.matches.description")}</p>
      </div>
      <Button render={<Link to="/player" />} variant="link">
        {t("player.backToWorkspace")}
      </Button>
    </div>
  );
}

function MatchesLoading({ t }: { readonly t: Translator }) {
  return (
    <section aria-busy="true" aria-label={t("player.matches.loading")} className="space-y-3">
      <p className="typo-caption text-muted-foreground">{t("player.matches.loading")}</p>
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
    </section>
  );
}

function OfficialHistoryEmpty({ t }: { readonly t: Translator }) {
  return (
    <EmptyState>
      <EmptyStateTitle>{t("player.matches.emptyTitle")}</EmptyStateTitle>
      <EmptyStateDescription>{t("player.official.emptyDescription")}</EmptyStateDescription>
      <EmptyStateActions>
        <Button render={<Link to="/player/game-accounts" />}>{t("player.gameData.review")}</Button>
      </EmptyStateActions>
    </EmptyState>
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
        {isPartial ? (
          <Badge variant="warning">{t("player.partialData")}</Badge>
        ) : (
          <Badge>{t("player.completeData")}</Badge>
        )}
      </div>

      <StatGroup className="mt-5">
        <Stat>
          <StatLabel>{t("player.metric.goals")}</StatLabel>
          <StatValue data-metric="goals">{formatNullable(match.goals, numberFormat, t)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.assists")}</StatLabel>
          <StatValue data-metric="assists">
            {formatNullable(match.assists, numberFormat, t)}
          </StatValue>
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.shots")}</StatLabel>
          <StatValue>{formatNullable(match.shots, numberFormat, t)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.saves")}</StatLabel>
          <StatValue>{formatNullable(match.saves, numberFormat, t)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>{t("player.metric.rating")}</StatLabel>
          <StatValue>{formatNullable(match.rating, numberFormat, t)}</StatValue>
        </Stat>
      </StatGroup>
    </li>
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
