"use client"

import { applyStyles, Badge } from "@futrob/ui"
import { StarIcon } from "@phosphor-icons/react"
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx"
import type { Translator } from "@/shared/presentation/i18n/translate.ts"
import {
  PROVIDER_PLAYER_METRICS,
  providerPositionLabelKey,
  type ProviderPlayer,
  type ProviderPlayerMetric,
  type ProviderMatchRosterModel,
  type ProviderRosterSection,
} from "./provider-match-detail-model.ts"
import { rosterTypography, styles } from "./provider-match-detail-rosters.styles.ts"

export function MatchRosters({
  numberFormat,
  sides,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat
  readonly sides: ProviderMatchRosterModel
  readonly t: Translator
}) {
  return (
    <div {...applyStyles(styles.stack)}>
      <RosterSection
        kind="selected"
        label={t("player.matchDetail.selectedClub")}
        numberFormat={numberFormat}
        section={sides.selected}
        t={t}
      />
      <RosterSection
        kind="opponent"
        label={t("player.matchDetail.opponent")}
        numberFormat={numberFormat}
        section={sides.opponent}
        t={t}
      />
    </div>
  )
}

function RosterSection({
  kind,
  label,
  numberFormat,
  section,
  t,
}: {
  readonly kind: "selected" | "opponent"
  readonly label: string
  readonly numberFormat: Intl.NumberFormat
  readonly section: ProviderRosterSection
  readonly t: Translator
}) {
  const crest = applyStyles(styles.crest)
  return (
    <section data-roster={kind} {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.heading)}>
        <ClubCrestAvatar
          className={crest.className}
          framed={false}
          imageUrl={section.team.imageUrl}
          name={section.team.name}
          style={crest.style}
        />
        <div {...applyStyles(styles.headingCopy)}>
          <p {...applyStyles(rosterTypography.caption, styles.muted)}>{label}</p>
          <h2 {...applyStyles(rosterTypography.subtitle, styles.teamName)}>{section.team.name}</h2>
        </div>
      </div>
      {section.players.length === 0 ? (
        <p {...applyStyles(rosterTypography.caption, styles.empty)}>
          {t("player.matchDetail.roster.empty")}
        </p>
      ) : (
        <ol {...applyStyles(styles.list)}>
          {section.players.map(({ isPersonal, player }) => (
            <li
              data-personal-player={isPersonal ? "" : undefined}
              data-player-name={player.displayName}
              data-roster-player=""
              key={`${player.externalClubId}:${player.externalPlayerId}`}
              {...applyStyles(styles.row)}
            >
              <div {...applyStyles(styles.rowHeader)}>
                <p {...applyStyles(rosterTypography.subtitle, styles.playerName)}>
                  {player.displayName}
                </p>
                <div {...applyStyles(styles.badges)}>
                  {isPersonal ? <Badge variant="outline">{t("player.matchDetail.you")}</Badge> : null}
                  {player.isMvp ? (
                    <Badge variant="outline">
                      <StarIcon aria-hidden="true" weight="fill" />
                      {t("player.matches.mvp")}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <PlayerMetrics numberFormat={numberFormat} player={player} t={t} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function PlayerMetrics({
  numberFormat,
  player,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat
  readonly player: ProviderPlayer
  readonly t: Translator
}) {
  return (
    <dl {...applyStyles(styles.metrics)}>
      {PROVIDER_PLAYER_METRICS.map((metric) => (
        <PlayerMetric
          key={metric.key}
          metric={metric}
          numberFormat={numberFormat}
          player={player}
          t={t}
        />
      ))}
    </dl>
  )
}

function PlayerMetric({
  metric,
  numberFormat,
  player,
  t,
}: {
  readonly metric: ProviderPlayerMetric
  readonly numberFormat: Intl.NumberFormat
  readonly player: ProviderPlayer
  readonly t: Translator
}) {
  return (
    <div {...applyStyles(styles.metric)}>
      <dt {...applyStyles(rosterTypography.caption, styles.metricLabel)}>{t(metric.labelKey)}</dt>
      <dd
        data-player-metric={metric.key}
        {...applyStyles(rosterTypography.caption, styles.metricValue)}
      >
        {metricValue(metric, player, numberFormat, t)}
      </dd>
    </div>
  )
}

function metricValue(
  metric: ProviderPlayerMetric,
  player: ProviderPlayer,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string {
  switch (metric.kind) {
    case "text": {
      const value = player.position
      if (value === null) return "—"
      const positionKey = providerPositionLabelKey(value)
      return positionKey ? t(positionKey) : value
    }
    case "number": {
      const value = player[metric.key]
      return value === null ? "—" : numberFormat.format(value)
    }
    default: {
      const _exhaustive: never = metric
      return _exhaustive
    }
  }
}
