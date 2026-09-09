import { Link } from "@tanstack/react-router";
import { ArrowsClockwiseIcon, CalendarBlankIcon, CircleNotchIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Button, Caption, Heading, Subtitle } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { MatchAppearanceStrip } from "@/modules/statistics/presentation/player-match-appearance.tsx";
import {
  MATCH_OUTCOME_KEYS,
  MATCH_TYPE_KEYS,
} from "@/modules/statistics/presentation/player-match-copy.ts";
import {
  MatchOutcomeCaption,
  matchTypeBadgeVariant,
} from "@/modules/statistics/presentation/player-match-row-parts.tsx";
import {
  rowTypography,
  styles as matchRowStyles,
} from "@/modules/statistics/presentation/player-match-row.styles.ts";
import {
  MatchHeaderMeta,
  ProviderMatchScore,
} from "@/modules/statistics/presentation/provider-match-scoreboard.tsx";
import {
  matchMvpDisplayName,
  matchOutcome,
  providerMatchMode,
} from "@/modules/statistics/presentation/player-match-view.ts";
import backgroundDefaultUrl from "@/assets/background-default.png";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import { HomeCard } from "./home-card.tsx";
import { lastMatchWhen } from "./player-home-copy.ts";
import type { PlayerHomeBottomLeftSlot } from "./player-home-model.ts";

const ICON_SIZE = 32;

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  stack: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2rem",
    position: "relative",
    zIndex: 1,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  appearance: {
    containerType: "inline-size",
    width: "100%",
  },
  scoreRow: {
    gap: "2rem",
  },
  emptyRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    columnGap: "0.75rem",
  },
  emptyCentered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    gap: "0.75rem",
    textAlign: "center",
  },
  emptyCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    maxWidth: "24rem",
  },
  emptyTitle: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
  emptyActions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
  },
  emptyIcon: {
    alignSelf: "center",
  },
  primaryOutline: {
    borderColor: {
      default: colors.primary,
      ":hover": colors.primaryHover,
      ":focus-visible": colors.ring,
    },
    color: {
      default: colors.primary,
      ":hover": colors.primaryHover,
    },
  },
  mutedSolid: {
    backgroundColor: {
      default: colors.muted,
      ":hover": colors.secondaryHover,
      ":active": colors.secondaryHover,
    },
  },
  spinner: {
    animationName: spin,
    animationDuration: "0.8s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
  iconCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "start",
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 20%, transparent)",
    color: colors.mutedForeground,
  },
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  slotCopy: {
    fontWeight: "var(--font-weight-medium)",
    whiteSpace: "pre-line",
  },
});

export function HomeLastMatchCard({
  onRefreshMatches,
  refreshing,
  slot,
}: {
  readonly onRefreshMatches: () => void;
  readonly refreshing: boolean;
  readonly slot: PlayerHomeBottomLeftSlot;
}) {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  switch (slot.kind) {
    case "last-match": {
      const { last } = slot;
      const outcome = matchOutcome(last);
      const mode = providerMatchMode(last);
      const mvpName = matchMvpDisplayName(last);
      const mvpLabel = mvpName ? t("player.matches.mvp.named", { name: mvpName }) : null;
      const occurredAt = new Date(last.match.occurredAt);
      return (
        <HomeCard
          action={{ label: t("player.home.lastMatch.viewAll"), to: "/player/matches" }}
          flush
          title={t("player.home.lastMatch.title")}
        >
          <MatchPitchSurface
            away={{ imageUrl: last.match.away.imageUrl, name: last.match.away.name }}
            home={{ imageUrl: last.match.home.imageUrl, name: last.match.home.name }}
          >
            <div {...applyStyles(styles.stack)}>
              <MatchHeaderMeta
                items={[
                  mode ? (
                    <Badge data-match-type={mode} key="type" variant={matchTypeBadgeVariant(mode)}>
                      {t(MATCH_TYPE_KEYS[mode])}
                    </Badge>
                  ) : null,
                  outcome !== "unknown" ? (
                    <MatchOutcomeCaption
                      key="outcome"
                      label={t(MATCH_OUTCOME_KEYS[outcome])}
                      outcome={outcome}
                    />
                  ) : null,
                  <time
                    dateTime={occurredAt.toISOString()}
                    key="when"
                    {...applyStyles(rowTypography.caption, matchRowStyles.when)}
                  >
                    <span {...applyStyles(matchRowStyles.medium)}>
                      {lastMatchWhen(last.match.occurredAt, locale, t)}
                    </span>
                  </time>,
                ]}
              />
              <ProviderMatchScore
                finalizedLabel={t("player.home.lastMatch.finished")}
                item={last}
                redCardsAway={null}
                redCardsHome={null}
                redCardsLabel={t("player.matches.metric.redCards")}
                scoreRowClassName={styles.scoreRow}
                vsLabel={t("player.matches.vs")}
              />
              {last.kind === "not_played" ? (
                <Caption>{t("player.home.lastMatch.didNotPlay")}</Caption>
              ) : (
                <div {...applyStyles(styles.appearance)}>
                  <MatchAppearanceStrip
                    item={last}
                    mvpLabel={mvpLabel}
                    numberFormat={numberFormat}
                    t={t}
                  />
                </div>
              )}
            </div>
          </MatchPitchSurface>
        </HomeCard>
      );
    }
    case "empty-matches":
      return (
        <HomeCard>
          <div {...applyStyles(styles.emptyCentered)}>
            <span aria-hidden {...applyStyles(styles.iconCell, styles.emptyIcon)}>
              <CalendarBlankIcon aria-hidden size={ICON_SIZE} {...applyStyles(styles.icon)} />
            </span>
            <div {...applyStyles(styles.emptyCopy)}>
              <Heading className={styles.emptyTitle}>
                {t("player.home.lastMatch.emptyTitle")}
              </Heading>
              <Subtitle>{t("player.home.lastMatch.emptySubtitle")}</Subtitle>
            </div>
            <div {...applyStyles(styles.emptyActions)}>
              <Button
                className={styles.primaryOutline}
                disabled={refreshing}
                onClick={onRefreshMatches}
                type="button"
                variant="outline"
              >
                {refreshing ? (
                  <CircleNotchIcon
                    aria-hidden
                    data-icon="inline-start"
                    size={16}
                    {...applyStyles(styles.spinner)}
                  />
                ) : (
                  <ArrowsClockwiseIcon aria-hidden data-icon="inline-start" size={16} />
                )}
                {refreshing ? t("player.home.updating") : t("player.home.cta.refreshMatches")}
              </Button>
              <Button
                className={styles.mutedSolid}
                render={<Link to="/player/game-accounts" />}
                variant="secondary"
              >
                {t("player.home.cta.reviewLink")}
              </Button>
            </div>
          </div>
        </HomeCard>
      );
    case "locked":
      return (
        <HomeCard title={t("player.home.lastMatch.lockedTitle")}>
          <EmptyMatchSubtitle>{t("player.home.stats.unavailableSubtitle")}</EmptyMatchSubtitle>
        </HomeCard>
      );
    case "onboarding":
      return (
        <HomeCard
          backgroundUrl={backgroundDefaultUrl}
          title={t("player.home.lastMatch.onboardingTitle")}
        >
          <EmptyMatchSubtitle>{t("player.home.lastMatch.onboardingSubtitle")}</EmptyMatchSubtitle>
        </HomeCard>
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

function EmptyMatchSubtitle({ children }: { readonly children: string }) {
  return (
    <div {...applyStyles(styles.emptyRow)}>
      <span aria-hidden {...applyStyles(styles.iconCell)}>
        <CalendarBlankIcon aria-hidden size={ICON_SIZE} {...applyStyles(styles.icon)} />
      </span>
      <Subtitle className={styles.slotCopy} tone="default">
        {children}
      </Subtitle>
    </div>
  );
}
