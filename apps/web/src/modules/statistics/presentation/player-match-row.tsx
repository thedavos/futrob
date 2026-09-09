"use client";

import { Link } from "@tanstack/react-router";
import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import { applyStyles, Badge, Button } from "@futrob/ui";
import { CaretRightIcon, PlugsIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { MATCH_OUTCOME_KEYS, MATCH_TYPE_KEYS, SCORING_FEAT_KEYS } from "./player-match-copy.ts";
import {
  appearanceRedCardsAria,
  listedClubRedCards,
  MatchOutcomeCaption,
  matchTypeBadgeVariant,
  notPlayedMessage,
  ScoringFeatBadge,
} from "./player-match-row-parts.tsx";
import { rowTypography, styles } from "./player-match-row.styles.ts";
import { MatchHeaderMeta, ProviderMatchScore } from "./provider-match-scoreboard.tsx";
import {
  appearanceScoringFeat,
  isDnfMatch,
  matchMvpDisplayName,
  matchOutcome,
  playerMatchSide,
  providerMatchMode,
  scoringFeatPlayerName,
  type MatchSortOrder,
  type PlayerMatchesView,
} from "./player-match-view.ts";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import { MatchAppearanceStrip } from "./player-match-appearance.tsx";

export function ProviderMatchRow({
  dateTimeFormat,
  item,
  numberFormat,
  sortOrder,
  showAppearanceStrip = true,
  showMatchType,
  showOpenMatch = true,
  t,
  view,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly item: PlayerRecentProviderMatchDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly sortOrder: MatchSortOrder;
  readonly showAppearanceStrip?: boolean;
  readonly showMatchType: boolean;
  readonly showOpenMatch?: boolean;
  readonly t: Translator;
  readonly view: PlayerMatchesView;
}) {
  const { match } = item;
  const occurredAt = new Date(match.occurredAt);
  const mode = providerMatchMode(item);
  const typeLabel = showMatchType && mode ? t(MATCH_TYPE_KEYS[mode]) : null;
  const outcome = matchOutcome(item);
  const outcomeLabel = outcome === "unknown" ? null : t(MATCH_OUTCOME_KEYS[outcome]);
  const feat = appearanceScoringFeat(item);
  const featLabel = feat ? t(SCORING_FEAT_KEYS[feat]) : null;
  const featScorerName = scoringFeatPlayerName(item);
  const mvpName = matchMvpDisplayName(item);
  const mvpLabel = mvpName ? t("player.matches.mvp.named", { name: mvpName }) : null;
  const dnf = isDnfMatch(item);
  const notPlayedLabel = notPlayedMessage(item, t);
  const side = playerMatchSide(item);
  const accessibleName = [
    match.home.name,
    String(match.home.goals),
    t("player.matches.vs"),
    String(match.away.goals),
    match.away.name,
    t("player.matches.finalized"),
    typeLabel,
    notPlayedLabel,
    outcomeLabel,
    dnf ? t("player.matches.dnf") : null,
    featLabel,
    mvpLabel,
    appearanceRedCardsAria(item, t),
    dateTimeFormat.format(occurredAt),
  ]
    .filter((part): part is string => part !== null)
    .join(" ");

  const { locale } = useI18n();
  const timeLabel = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(occurredAt);
  const surface = applyStyles(styles.onPitchSurface);

  return (
    <li aria-label={accessibleName} {...applyStyles(styles.item)}>
      <MatchPitchSurface
        away={{ imageUrl: match.away.imageUrl, name: match.away.name }}
        className={styles.card}
        home={{ imageUrl: match.home.imageUrl, name: match.home.name }}
      >
        <div {...applyStyles(styles.body)}>
          <div {...applyStyles(styles.header, showOpenMatch && styles.headerOpen)}>
            <MatchHeaderMeta
              items={[
                typeLabel && mode ? (
                  <Badge
                    className={surface.className}
                    data-match-type={mode}
                    key="type"
                    style={surface.style}
                    variant={matchTypeBadgeVariant(mode)}
                  >
                    {typeLabel}
                  </Badge>
                ) : null,
                outcomeLabel && outcome !== "unknown" ? (
                  <MatchOutcomeCaption key="outcome" label={outcomeLabel} outcome={outcome} />
                ) : null,
                notPlayedLabel ? (
                  <span
                    data-played="false"
                    key="played"
                    {...applyStyles(rowTypography.caption, styles.muted)}
                  >
                    <span {...applyStyles(styles.medium)}>{notPlayedLabel}</span>
                  </span>
                ) : null,
                dnf ? (
                  <span
                    aria-label={t("player.matches.dnf")}
                    data-match-dnf=""
                    key="dnf"
                    title={t("player.matches.dnf")}
                    {...applyStyles(styles.dnf)}
                  >
                    <PlugsIcon aria-hidden="true" {...applyStyles(styles.dnfIcon)} />
                  </span>
                ) : null,
                <time
                  dateTime={occurredAt.toISOString()}
                  key="when"
                  {...applyStyles(rowTypography.caption, styles.when)}
                >
                  <span {...applyStyles(styles.medium)}>{timeLabel}</span>
                </time>,
              ]}
            />
            {showOpenMatch ? (
              <Button
                aria-label={t("player.matches.openMatchLabel", {
                  away: match.away.name,
                  awayGoals: match.away.goals,
                  home: match.home.name,
                  homeGoals: match.home.goals,
                })}
                data-match-chevron=""
                dense
                render={
                  <Link
                    params={{
                      providerKey: match.provider.key,
                      externalMatchId: match.provider.externalMatchId,
                    }}
                    search={{ view, sort: sortOrder }}
                    to="/player/matches/$providerKey/$externalMatchId"
                  />
                }
                role="link"
                size="icon"
                variant="ghost"
                {...applyStyles(styles.chevron)}
              >
                <CaretRightIcon />
              </Button>
            ) : null}
          </div>

          <div {...applyStyles(styles.center)}>
            <ProviderMatchScore
              finalizedLabel={t("player.matches.finalized")}
              item={item}
              redCardsAway={listedClubRedCards(item, side, "away")}
              redCardsHome={listedClubRedCards(item, side, "home")}
              redCardsLabel={t("player.matches.metric.redCards")}
              vsLabel={t("player.matches.vs")}
            />

            {featLabel && feat ? (
              <div {...applyStyles(styles.featRow)}>
                <ScoringFeatBadge
                  feat={feat}
                  featLabel={featLabel}
                  scorerName={featScorerName}
                  t={t}
                />
              </div>
            ) : null}
          </div>
        </div>
        {showAppearanceStrip ? (
          <MatchAppearanceStrip item={item} mvpLabel={mvpLabel} numberFormat={numberFormat} t={t} />
        ) : null}
      </MatchPitchSurface>
    </li>
  );
}
