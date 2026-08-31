"use client";

import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Alert,
  AlertDescription,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useMyGameProfileQuery } from "../statistics-queries.ts";
import { PlayerProfileIdentity } from "./player-profile-identity.tsx";
import { PlayerProfileKpis } from "./player-profile-kpis.tsx";

const playerProfileChartsModule = import("./player-profile-charts.tsx");
const PlayerProfileCharts = lazy(() =>
  playerProfileChartsModule.then((module) => ({ default: module.PlayerProfileCharts })),
);

const styles = stylex.create({
  main: {
    width: "100%",
  },
  error: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  ready: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  loadingGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  skeletonStat: {
    height: "6.5rem",
  },
  skeletonChart: {
    height: "18rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
});

export function PlayerStatisticsPage() {
  const { t, locale } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 2,
  });
  const percentFormat = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const dateFormat = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    day: "numeric",
    month: "short",
  });
  const profileQuery = useMyGameProfileQuery();
  const readyProfile =
    profileQuery.data?.status === "ready" && profileQuery.data.profile.sampleSize > 0
      ? profileQuery.data.profile
      : null;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("player.statistics.title")}</PageHeaderTitle>
        {readyProfile ? null : (
          <PageHeaderDescription>{t("player.statistics.description")}</PageHeaderDescription>
        )}
      </PageHeader>
      {profileQuery.isPending ? <ProfileLoading t={t} /> : null}
      {profileQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription {...applyStyles(styles.error)}>
            <span>{t("player.statistics.error")}</span>
            <Button onClick={() => void profileQuery.refetch()} variant="secondary">
              {t("player.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {profileQuery.data?.status === "needs_club" ? (
        <ProfileEmpty
          actionHref="/player/ea-clubs"
          actionLabel={t("shell.workspace.addClub")}
          description={t("player.statistics.needsClub.description")}
          title={t("player.statistics.needsClub.title")}
        />
      ) : null}
      {profileQuery.data?.status === "needs_game_account" ? (
        <ProfileEmpty
          actionHref="/player/game-accounts"
          actionLabel={t("player.gameData.review")}
          description={t("player.statistics.needsGameAccount.description")}
          title={t("player.statistics.needsGameAccount.title")}
        />
      ) : null}
      {profileQuery.data?.status === "ready" && profileQuery.data.profile.sampleSize === 0 ? (
        <ProfileEmpty
          actionHref="/player/matches"
          actionLabel={t("player.nav.matches")}
          description={t("player.statistics.emptyDescription")}
          title={t("player.statistics.emptyTitle")}
        />
      ) : null}
      {readyProfile ? (
        <ProfileReady
          dateFormat={dateFormat}
          numberFormat={numberFormat}
          percentFormat={percentFormat}
          profile={readyProfile}
          t={t}
        />
      ) : null}
    </main>
  );
}

function ProfileReady({
  dateFormat,
  numberFormat,
  percentFormat,
  profile,
  t,
}: {
  readonly dateFormat: Intl.DateTimeFormat;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly profile: PlayerGameProfileDto;
  readonly t: Translator;
}) {
  const hasPartial = Object.values(profile.summary.partial).some(Boolean);

  return (
    <div {...applyStyles(styles.ready)}>
      <PlayerProfileIdentity profile={profile} t={t} />
      <PlayerProfileKpis
        numberFormat={numberFormat}
        percentFormat={percentFormat}
        profile={profile}
        t={t}
      />
      {hasPartial ? (
        <Alert>
          <AlertDescription>{t("player.partialData.description")}</AlertDescription>
        </Alert>
      ) : null}
      <Suspense fallback={<ChartSectionFallback t={t} />}>
        <PlayerProfileCharts
          dateFormat={dateFormat}
          numberFormat={numberFormat}
          percentFormat={percentFormat}
          profile={profile}
          t={t}
        />
      </Suspense>
    </div>
  );
}

function ChartSectionFallback({ t }: { readonly t: Translator }) {
  return (
    <Skeleton aria-label={t("player.statistics.loading")} {...applyStyles(styles.skeletonChart)} />
  );
}

function ProfileLoading({ t }: { readonly t: Translator }) {
  return (
    <section
      aria-busy="true"
      aria-label={t("player.statistics.loading")}
      {...applyStyles(styles.loading)}
    >
      <Caption {...applyStyles(styles.muted)}>{t("player.statistics.loading")}</Caption>
      <div {...applyStyles(styles.loadingGrid)}>
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
        <Skeleton {...applyStyles(styles.skeletonStat)} />
      </div>
      <Skeleton {...applyStyles(styles.skeletonChart)} />
    </section>
  );
}

function ProfileEmpty({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  readonly actionHref: "/player/ea-clubs" | "/player/game-accounts" | "/player/matches";
  readonly actionLabel: string;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <EmptyState>
      <EmptyStateTitle>{title}</EmptyStateTitle>
      <EmptyStateDescription>{description}</EmptyStateDescription>
      <EmptyStateActions>
        <Button render={<Link to={actionHref} />} role="link">
          {actionLabel}
        </Button>
      </EmptyStateActions>
    </EmptyState>
  );
}
