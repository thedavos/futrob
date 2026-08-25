"use client"

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts"
import * as stylex from "@stylexjs/stylex"
import { applyStyles, colors, Tooltip, TooltipContent, TooltipTrigger, typography } from "@futrob/ui"
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx"
import type { Translator } from "@/shared/presentation/i18n/translate.ts"
import { FORM_OUTCOME_SHORT_KEYS, FORM_SEGMENT_TOOLTIP_KEYS } from "./player-match-copy.ts"
import { formResultFillStyle, formSegmentStyle } from "./player-match-tone.ts"
import {
  formTimeline,
  lastFormGames,
  matchOutcome,
  opponentClubName,
  playerMatchSide,
} from "./player-match-view.ts"

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  bar: {
    display: "flex",
    height: "0.625rem",
    width: "100%",
    gap: "0.125rem",
    overflow: "hidden",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.surface,
  },
  footer: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  heading: {
    fontWeight: 500,
    minWidth: 0,
    color: colors.mutedForeground,
  },
  lastGames: {
    display: "flex",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: "0.25rem",
  },
  segment: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    position: {
      default: null,
      ":focus-visible": "relative",
    },
    zIndex: {
      default: null,
      ":focus-visible": 10,
    },
    outlineWidth: {
      default: null,
      ":focus-visible": 2,
    },
    outlineStyle: {
      default: null,
      ":focus-visible": "solid",
    },
    outlineOffset: {
      default: null,
      ":focus-visible": "-2px",
    },
    outlineColor: {
      default: null,
      ":focus-visible": colors.ring,
    },
  },
  result: {
    display: "inline-flex",
    width: "1.75rem",
    height: "1.75rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-md)",
  },
})

export function RecentForm({
  matches,
}: {
  readonly matches: readonly PlayerRecentProviderMatchDto[]
}) {
  const { t } = useI18n()
  const timeline = formTimeline(matches)
  const lastGames = lastFormGames(matches)

  return (
    <div
      aria-labelledby="player-matches-form-heading"
      data-recent-form=""
      role="group"
      {...applyStyles(styles.root)}
    >
      <div data-recent-form-bar="" {...applyStyles(styles.bar)}>
        {timeline.map((item) => (
          <FormSegment item={item} key={item.match.id} />
        ))}
      </div>
      <div {...applyStyles(styles.footer)}>
        <p id="player-matches-form-heading" {...applyStyles(typography.caption, styles.heading)}>
          {t("player.matches.form.label")}
        </p>
        <ol data-last-games="" {...applyStyles(styles.lastGames)}>
          {lastGames.map((item) => (
            <FormResultMark item={item} key={item.match.id} />
          ))}
        </ol>
      </div>
    </div>
  )
}

function FormSegment({ item }: { readonly item: PlayerRecentProviderMatchDto }) {
  const { t } = useI18n()
  const outcome = matchOutcome(item)
  const label = formSegmentLabel(item, t)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            data-form-segment={outcome}
            type="button"
            {...applyStyles(styles.segment, formSegmentStyle(outcome))}
          />
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function FormResultMark({ item }: { readonly item: PlayerRecentProviderMatchDto }) {
  const { t } = useI18n()
  const outcome = matchOutcome(item)
  const label = formSegmentLabel(item, t)

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={label}
              data-last-game={item.match.id}
              data-last-game-outcome={outcome}
              type="button"
              {...applyStyles(styles.result, typography.label, formResultFillStyle(outcome))}
            />
          }
        >
          <span aria-hidden="true">{t(FORM_OUTCOME_SHORT_KEYS[outcome])}</span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </li>
  )
}

function formSegmentLabel(item: PlayerRecentProviderMatchDto, t: Translator): string {
  const outcome = matchOutcome(item)
  const opponent = opponentClubName(item)
  if (outcome === "unknown" || opponent === null) {
    return t("player.matches.form.unknownMatch", {
      home: item.match.home.name,
      away: item.match.away.name,
      score: `${item.match.home.goals} ${t("player.matches.vs")} ${item.match.away.goals}`,
    })
  }
  return t(FORM_SEGMENT_TOOLTIP_KEYS[outcome], {
    score: listedScoreline(item, t),
    opponent,
  })
}

function listedScoreline(item: PlayerRecentProviderMatchDto, t: Translator): string {
  const side = playerMatchSide(item)
  const scored = side === "away" ? item.match.away.goals : item.match.home.goals
  const conceded = side === "away" ? item.match.home.goals : item.match.away.goals
  return `${scored} ${t("player.matches.vs")} ${conceded}`
}
