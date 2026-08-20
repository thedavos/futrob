"use client";

import { Badge } from "@futrob/ui";
import { StarIcon } from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  PROVIDER_PLAYER_METRICS,
  providerPositionLabelKey,
  type ProviderPlayer,
  type ProviderPlayerMetric,
  type ProviderMatchRosterModel,
  type ProviderRosterSection,
} from "./provider-match-detail-model.ts";

export function MatchRosters({
  numberFormat,
  sides,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly sides: ProviderMatchRosterModel;
  readonly t: Translator;
}) {
  return (
    <div className="space-y-10">
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
  );
}

function RosterSection({
  kind,
  label,
  numberFormat,
  section,
  t,
}: {
  readonly kind: "selected" | "opponent";
  readonly label: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly section: ProviderRosterSection;
  readonly t: Translator;
}) {
  return (
    <section className="space-y-4" data-roster={kind}>
      <div className="flex min-w-0 items-center gap-3">
        <ClubCrestAvatar
          className="size-10 shrink-0"
          framed={false}
          imageUrl={section.team.imageUrl}
          name={section.team.name}
        />
        <div className="min-w-0">
          <p className="typo-caption text-muted-foreground">{label}</p>
          <h2 className="typo-subtitle truncate font-semibold">{section.team.name}</h2>
        </div>
      </div>
      {section.players.length === 0 ? (
        <p className="typo-caption rounded-xl border border-border px-4 py-5 text-muted-foreground">
          {t("player.matchDetail.roster.empty")}
        </p>
      ) : (
        <ol className="overflow-hidden rounded-xl border border-border bg-surface">
          {section.players.map(({ isPersonal, player }) => (
            <li
              className="border-b border-border px-4 py-4 last:border-b-0 sm:px-5"
              data-personal-player={isPersonal ? "" : undefined}
              data-player-name={player.displayName}
              data-roster-player=""
              key={`${player.externalClubId}:${player.externalPlayerId}`}
            >
              <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                <p className="typo-subtitle min-w-0 truncate font-semibold">{player.displayName}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {isPersonal ? (
                    <Badge variant="outline">{t("player.matchDetail.you")}</Badge>
                  ) : null}
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
  );
}

function PlayerMetrics({
  numberFormat,
  player,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly player: ProviderPlayer;
  readonly t: Translator;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
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
  );
}

function PlayerMetric({
  metric,
  numberFormat,
  player,
  t,
}: {
  readonly metric: ProviderPlayerMetric;
  readonly numberFormat: Intl.NumberFormat;
  readonly player: ProviderPlayer;
  readonly t: Translator;
}) {
  return (
    <div className="min-w-0">
      <dt className="typo-caption truncate text-muted-foreground">{t(metric.labelKey)}</dt>
      <dd
        className="typo-caption mt-0.5 font-semibold tabular-nums"
        data-player-metric={metric.key}
      >
        {metricValue(metric, player, numberFormat, t)}
      </dd>
    </div>
  );
}

function metricValue(
  metric: ProviderPlayerMetric,
  player: ProviderPlayer,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string {
  switch (metric.kind) {
    case "text": {
      const value = player.position;
      if (value === null) return "—";
      const positionKey = providerPositionLabelKey(value);
      return positionKey ? t(positionKey) : value;
    }
    case "number": {
      const value = player[metric.key];
      return value === null ? "—" : numberFormat.format(value);
    }
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}
