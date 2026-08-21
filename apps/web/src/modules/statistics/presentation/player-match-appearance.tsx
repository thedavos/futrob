"use client";

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import { Badge, type Icon, type IconWeight } from "@futrob/ui";
import { HandshakeIcon, RectangleIcon, SoccerBallIcon, StarIcon } from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { playedAppearance, showsYellowCards } from "./player-match-view.ts";

export function MatchAppearanceStrip({
  item,
  mvpLabel,
  numberFormat,
  t,
}: {
  readonly item: PlayerRecentProviderMatchDto;
  readonly mvpLabel: string | null;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const appearance = playedAppearance(item);
  if (!appearance) return null;
  const showYellow = showsYellowCards(appearance.yellowCards);
  const name = appearance.displayName.trim();
  return (
    <div className="relative z-10 flex justify-center px-4 pb-3 @lg:pb-4">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 @lg:gap-x-3 @lg:gap-y-2 @lg:rounded-full @lg:bg-surface @lg:px-4 @lg:py-2.5 @lg:smooth-shadow-ring-sm">
        {mvpLabel ? <MatchMvpBadge label={mvpLabel} /> : null}
        {mvpLabel === null && name !== "" ? (
          <span className="inline-flex min-w-0 max-w-[9rem] items-center gap-1">
            <StarIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
              weight="fill"
            />
            <span className="typo-caption min-w-0 truncate">
              <span className="font-semibold">{name}</span>
            </span>
          </span>
        ) : null}
        <AppearanceStripStat
          icon={SoccerBallIcon}
          metric="recent-goals"
          numberFormat={numberFormat}
          t={t}
          unitKey="player.matches.appearance.goalsUnit"
          value={appearance.goals}
        />
        <AppearanceStripStat
          icon={HandshakeIcon}
          metric="recent-assists"
          numberFormat={numberFormat}
          t={t}
          unitKey="player.matches.appearance.assistsUnit"
          value={appearance.assists}
        />
        {showYellow ? (
          <AppearanceStripStat
            icon={RectangleIcon}
            iconClassName="size-3.5 rotate-90 text-warning"
            iconWeight="fill"
            metric="recent-yellow"
            numberFormat={numberFormat}
            t={t}
            unitKey={null}
            value={appearance.yellowCards}
          />
        ) : null}
        <Badge className="font-semibold" variant={ratingBadgeVariant(appearance.rating)}>
          <StarIcon
            aria-hidden="true"
            className="size-3.5"
            data-metric-icon="recent-rating"
            weight="fill"
          />
          <span className="typo-caption @max-lg:sr-only">
            <span className="font-medium">{t("player.metric.rating")}</span>
          </span>
          {appearance.rating === null ? (
            <span className="typo-caption" data-size="empty">
              <span className="font-medium" data-metric="recent-rating">
                {t("player.noData")}
              </span>
            </span>
          ) : (
            <span className="typo-caption tabular-nums">
              <span className="font-medium" data-metric="recent-rating">
                {numberFormat.format(appearance.rating)}
              </span>
            </span>
          )}
        </Badge>
      </div>
    </div>
  );
}

function MatchMvpBadge({ label }: { readonly label: string }) {
  return (
    <Badge data-mvp="" variant="warning">
      <StarIcon aria-hidden="true" className="text-warning" weight="fill" />
      <span className="font-medium">{label}</span>
    </Badge>
  );
}

function AppearanceStripStat({
  icon: MetricIcon,
  iconClassName = "size-3.5",
  iconWeight = "regular",
  metric,
  numberFormat,
  t,
  unitKey,
  value,
}: {
  readonly icon: Icon;
  readonly iconClassName?: string;
  readonly iconWeight?: IconWeight;
  readonly metric: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
  readonly unitKey:
    | "player.matches.appearance.goalsUnit"
    | "player.matches.appearance.assistsUnit"
    | null;
  readonly value: number | null;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <MetricIcon
        aria-hidden="true"
        className={iconClassName}
        data-metric-icon={metric}
        weight={iconWeight}
      />
      {value === null ? (
        <span className="typo-caption" data-size="empty">
          <span className="font-medium" data-metric={metric}>
            {t("player.noData")}
          </span>
        </span>
      ) : (
        <>
          <span className="typo-caption tabular-nums text-foreground">
            <span className="font-semibold" data-metric={metric}>
              {numberFormat.format(value)}
            </span>
          </span>
          {unitKey === null ? null : (
            <span className="typo-caption @max-lg:sr-only">
              <span className="font-medium">{t(unitKey, { count: value })}</span>
            </span>
          )}
        </>
      )}
    </span>
  );
}

function ratingBadgeVariant(rating: number | null): "primary" | "outline" {
  return rating !== null && rating >= 7 ? "primary" : "outline";
}
