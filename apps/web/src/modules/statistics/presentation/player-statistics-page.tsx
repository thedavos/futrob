"use client";

import { Link } from "@tanstack/react-router";
import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
  Skeleton,
  Stat,
  StatGroup,
  StatHint,
  StatLabel,
  StatValue,
} from "@futrob/ui";
import { pageTypography, styles } from "./player-statistics-page.styles.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PlayerGameProfileAttributes } from "./player-game-profile-attributes.tsx";
import { PlayerGameProfileBreakdown } from "./player-game-profile-breakdown.tsx";
import { providerPositionLabelKey } from "./provider-match-detail-model.ts";
import { useMyGameProfileQuery } from "./statistics-queries.ts";

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
    day: "2-digit",
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
        <PageHeaderEyebrow>{t("player.workspace.eyebrow")}</PageHeaderEyebrow>
        {readyProfile ? (
          <div {...applyStyles(styles.identity)}>
            <Avatar {...applyStyles(styles.avatar)}>
              <AvatarFallback {...applyStyles(pageTypography.label)}>
                {initialsFromName(readyProfile.identity.displayName)}
              </AvatarFallback>
            </Avatar>
            <div {...applyStyles(styles.identityCopy)}>
              <PageHeaderTitle>{readyProfile.identity.displayName}</PageHeaderTitle>
              <PageHeaderDescription>{identityDescription(readyProfile, t)}</PageHeaderDescription>
            </div>
          </div>
        ) : (
          <>
            <PageHeaderTitle>{t("player.statistics.title")}</PageHeaderTitle>
            <PageHeaderDescription>{t("player.statistics.description")}</PageHeaderDescription>
          </>
        )}
        <PageHeaderActions>
          <Button render={<Link to="/player" />} variant="link">
            {t("player.backToWorkspace")}
          </Button>
        </PageHeaderActions>
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
      <section aria-label={t("player.statistics.summary")} {...applyStyles(styles.section)}>
        <p {...applyStyles(pageTypography.caption, styles.muted)}>{t("player.statistics.sampleHint")}</p>
        <StatGroup>
          <Stat>
            <StatLabel>{t("player.statistics.elo")}</StatLabel>
            <StatValue>{profile.elo.rating}</StatValue>
            <StatHint>
              {t("player.statistics.elo.hint", { count: profile.elo.ratedMatches })}
            </StatHint>
          </Stat>
          <Stat>
            <StatLabel>{t("player.statistics.record")}</StatLabel>
            <StatValue>
              {`${profile.summary.wins}–${profile.summary.draws}–${profile.summary.losses}`}
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t("player.metric.rating")}</StatLabel>
            <StatValue>
              {profile.summary.averages.rating === null
                ? t("player.noData")
                : numberFormat.format(profile.summary.averages.rating)}
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>{t("player.metric.goals")}</StatLabel>
            <StatValue>{numberFormat.format(profile.summary.totals.goals)}</StatValue>
          </Stat>
        </StatGroup>
        {hasPartial ? (
          <Alert>
            <AlertDescription>{t("player.partialData.description")}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <PlayerGameProfileAttributes
        numberFormat={numberFormat}
        percentFormat={percentFormat}
        profile={profile}
        t={t}
      />

      <section aria-label={t("player.statistics.evolution")} {...applyStyles(styles.evolution)}>
        <h2 {...applyStyles(pageTypography.label)}>{t("player.statistics.evolution")}</h2>
        {profile.evolution.length === 0 ? (
          <p {...applyStyles(pageTypography.caption, styles.muted)}>
            {t("player.statistics.evolution.empty")}
          </p>
        ) : (
          <ol {...applyStyles(styles.evolutionList)}>
            {profile.evolution.slice(-12).map((point) => (
              <li key={point.occurredAt}>
                <Badge variant={outcomeBadge(point.outcome)}>
                  {`${dateFormat.format(new Date(point.occurredAt))} · ${point.elo}${
                    point.rating === null ? "" : ` · ${numberFormat.format(point.rating)}`
                  } · ${outcomeLabel(point.outcome, t)}`}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </section>

      <PlayerGameProfileBreakdown numberFormat={numberFormat} profile={profile} t={t} />
    </div>
  );
}

function ProfileLoading({ t }: { readonly t: Translator }) {
  return (
    <section aria-busy="true" aria-label={t("player.statistics.loading")} {...applyStyles(styles.loading)}>
      <p {...applyStyles(pageTypography.caption, styles.muted)}>{t("player.statistics.loading")}</p>
      <div {...applyStyles(styles.loadingGrid)}>
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
        <Button render={<Link to={actionHref} />}>{actionLabel}</Button>
      </EmptyStateActions>
    </EmptyState>
  );
}

function identityDescription(profile: PlayerGameProfileDto, t: Translator): string {
  return `${positionLabel(profile.identity, t)} · ${t("player.statistics.matchesCount", {
    count: profile.sampleSize,
  })}`;
}

function positionLabel(identity: PlayerGameProfileDto["identity"], t: Translator): string {
  if (identity.preferredPosition === null) return t("player.position.unknown");
  const key = providerPositionLabelKey(identity.preferredPosition);
  return key ? t(key) : identity.preferredPosition;
}

function outcomeLabel(
  outcome: PlayerGameProfileDto["evolution"][number]["outcome"],
  t: Translator,
): string {
  switch (outcome) {
    case "win":
      return t("player.matches.outcome.win");
    case "draw":
      return t("player.matches.outcome.draw");
    case "loss":
      return t("player.matches.outcome.loss");
    case "unknown":
      return t("player.matches.outcome.unknown");
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

function outcomeBadge(
  outcome: PlayerGameProfileDto["evolution"][number]["outcome"],
): "approved" | "neutral" | "destructive" | "outline" {
  switch (outcome) {
    case "win":
      return "approved";
    case "draw":
      return "neutral";
    case "loss":
      return "destructive";
    case "unknown":
      return "outline";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}
