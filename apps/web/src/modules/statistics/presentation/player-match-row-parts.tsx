import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts"
import { applyStyles, Badge, Tooltip, TooltipContent, TooltipTrigger } from "@futrob/ui"
import { RectangleIcon, SoccerBallIcon } from "@phosphor-icons/react"
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx"
import type { Translator } from "@/shared/presentation/i18n/translate.ts"
import { rowTypography, styles } from "./player-match-row.styles.ts"
import {
  playedAppearance,
  showsRedCards,
  type ProviderMatchMode,
  type ScoringFeat,
} from "./player-match-view.ts"

export function notPlayedMessage(
  item: PlayerRecentProviderMatchDto,
  t: Translator,
): string | null {
  return item.kind === "not_played" ? t("player.matches.notPlayed") : null
}

export function listedClubRedCards(
  item: PlayerRecentProviderMatchDto,
  side: "home" | "away" | null,
  column: "home" | "away",
): number | null {
  const appearance = playedAppearance(item)
  return appearance && side === column ? appearance.redCards : null
}

export function appearanceRedCardsAria(
  item: PlayerRecentProviderMatchDto,
  t: Translator,
): string | null {
  const appearance = playedAppearance(item)
  if (!appearance || !showsRedCards(appearance.redCards) || appearance.redCards === null) {
    return null
  }
  return `${t("player.matches.metric.redCards")} ${appearance.redCards}`
}

export function scoreDigitStyle(homeGoals: number, awayGoals: number, side: "home" | "away") {
  const leads = side === "home" ? homeGoals > awayGoals : awayGoals > homeGoals
  return leads ? styles.scoreLead : styles.scoreTrail
}

export function matchTypeBadgeVariant(mode: ProviderMatchMode): "emphasis" | "info" | "neutral" {
  switch (mode) {
    case "leagueMatch":
      return "emphasis"
    case "playoffMatch":
      return "info"
    case "friendlyMatch":
      return "neutral"
    default: {
      const _exhaustive: never = mode
      return _exhaustive
    }
  }
}

export function MatchClubSide({
  imageUrl,
  name,
  redCards,
  redCardsLabel,
}: {
  readonly imageUrl: string | null
  readonly name: string
  readonly redCards: number | null
  readonly redCardsLabel: string
}) {
  const crest = applyStyles(styles.crest)
  const fallback = applyStyles(styles.crestFallback)
  return (
    <div {...applyStyles(styles.club)}>
      <ClubCrestAvatar
        className={crest.className}
        fallbackClassName={fallback.className}
        framed={false}
        imageUrl={imageUrl}
        name={name}
        style={crest.style}
      />
      <MatchClubMeta name={name} redCards={redCards} redCardsLabel={redCardsLabel} />
    </div>
  )
}

function MatchClubMeta({
  name,
  redCards,
  redCardsLabel,
}: {
  readonly name: string
  readonly redCards: number | null
  readonly redCardsLabel: string
}) {
  const showRed = showsRedCards(redCards)

  return (
    <div {...applyStyles(styles.clubMeta)}>
      <p {...applyStyles(rowTypography.subtitle, styles.clubName)}>
        <span {...applyStyles(styles.clubNameText)}>{name}</span>
      </p>
      {showRed && redCards !== null ? (
        <span
          aria-label={`${redCardsLabel} ${redCards}`}
          data-metric="recent-red"
          {...applyStyles(rowTypography.caption, styles.red)}
        >
          <RectangleIcon
            aria-hidden
            data-card-icon="red"
            weight="fill"
            {...applyStyles(styles.redIcon)}
          />
          {redCards}
        </span>
      ) : null}
    </div>
  )
}

export function ScoringFeatBadge({
  feat,
  featLabel,
  scorerName,
  t,
}: {
  readonly feat: ScoringFeat
  readonly featLabel: string
  readonly scorerName: string | null
  readonly t: Translator
}) {
  const surface = applyStyles(styles.onPitchSurface)
  const badge = (
    <Badge
      className={surface.className}
      data-feat-scorer={scorerName ?? undefined}
      data-scoring-feat={feat}
      style={surface.style}
      variant="warning"
    >
      <SoccerBallIcon aria-hidden="true" />
      {featLabel}
    </Badge>
  )
  if (scorerName === null) return badge
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} {...applyStyles(styles.featTrigger)} />}>
        {badge}
      </TooltipTrigger>
      <TooltipContent>{t("player.matches.feat.scorer", { name: scorerName })}</TooltipContent>
    </Tooltip>
  )
}
