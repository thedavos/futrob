"use client";

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, typography, type Icon, type IconWeight } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { HandshakeIcon, RectangleIcon, SoccerBallIcon, StarIcon } from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { playedAppearance, showsYellowCards } from "./player-match-view.ts";

const styles = stylex.create({
  wrap: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    justifyContent: "center",
    paddingInline: "1rem",
    paddingBottom: {
      default: "0.75rem",
      "@container (min-width: 32rem)": "1rem",
    },
  },
  strip: {
    display: "flex",
    maxWidth: "100%",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: {
      default: "0.625rem",
      "@container (min-width: 32rem)": "0.75rem",
    },
    rowGap: {
      default: "0.25rem",
      "@container (min-width: 32rem)": "0.5rem",
    },
    borderRadius: {
      default: null,
      "@container (min-width: 32rem)": "var(--corner-full)",
    },
    backgroundColor: {
      default: null,
      "@container (min-width: 32rem)": colors.surface,
    },
    paddingInline: {
      default: null,
      "@container (min-width: 32rem)": "1rem",
    },
    paddingBlock: {
      default: null,
      "@container (min-width: 32rem)": "0.625rem",
    },
    boxShadow: {
      default: null,
      "@container (min-width: 32rem)": "var(--elevation-shadow-sm)",
    },
  },
  name: {
    display: "inline-flex",
    minWidth: 0,
    maxWidth: "9rem",
    alignItems: "center",
    gap: "0.25rem",
  },
  nameIcon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  nameText: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  nameStrong: {
    fontWeight: 600,
  },
  badgeStrong: {
    fontWeight: 600,
  },
  icon: {
    width: "0.875rem",
    height: "0.875rem",
  },
  cqSrOnly: {
    position: {
      default: "absolute",
      "@container (min-width: 32rem)": "static",
    },
    width: {
      default: 1,
      "@container (min-width: 32rem)": "auto",
    },
    height: {
      default: 1,
      "@container (min-width: 32rem)": "auto",
    },
    padding: 0,
    margin: {
      default: -1,
      "@container (min-width: 32rem)": 0,
    },
    overflow: {
      default: "hidden",
      "@container (min-width: 32rem)": "visible",
    },
    clip: {
      default: "rect(0, 0, 0, 0)",
      "@container (min-width: 32rem)": "auto",
    },
    whiteSpace: {
      default: "nowrap",
      "@container (min-width: 32rem)": "normal",
    },
    borderWidth: 0,
  },
  mvpIcon: {
    color: colors.warning,
  },
  mvpLabel: {
    fontWeight: 500,
  },
  stat: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: colors.mutedForeground,
  },
  yellowIcon: {
    width: "0.875rem",
    height: "0.875rem",
    transform: "rotate(90deg)",
    color: colors.warning,
  },
  medium: {
    fontWeight: 500,
  },
  value: {
    fontVariantNumeric: "tabular-nums",
    color: colors.foreground,
  },
  valueStrong: {
    fontWeight: 600,
  },
});

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
    <div {...applyStyles(styles.wrap)}>
      <div {...applyStyles(styles.strip)}>
        {mvpLabel ? <MatchMvpBadge label={mvpLabel} /> : null}
        {mvpLabel === null && name !== "" ? (
          <span {...applyStyles(styles.name)}>
            <StarIcon aria-hidden="true" weight="fill" {...applyStyles(styles.nameIcon)} />
            <span {...applyStyles(typography.caption, styles.nameText)}>
              <span {...applyStyles(styles.nameStrong)}>{name}</span>
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
            iconStyle="yellow"
            iconWeight="fill"
            metric="recent-yellow"
            numberFormat={numberFormat}
            t={t}
            unitKey={null}
            value={appearance.yellowCards}
          />
        ) : null}
        <Badge variant={ratingBadgeVariant(appearance.rating)} {...applyStyles(styles.badgeStrong)}>
          <StarIcon
            aria-hidden="true"
            data-metric-icon="recent-rating"
            weight="fill"
            {...applyStyles(styles.icon)}
          />
          <span {...applyStyles(typography.caption, styles.cqSrOnly)}>
            <span {...applyStyles(styles.medium)}>{t("player.metric.rating")}</span>
          </span>
          {appearance.rating === null ? (
            <span data-size="empty" {...applyStyles(typography.caption)}>
              <span data-metric="recent-rating" {...applyStyles(styles.medium)}>
                {t("player.noData")}
              </span>
            </span>
          ) : (
            <span {...applyStyles(typography.caption, styles.value)}>
              <span data-metric="recent-rating" {...applyStyles(styles.medium)}>
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
      <StarIcon aria-hidden="true" weight="fill" {...applyStyles(styles.mvpIcon)} />
      <span {...applyStyles(styles.mvpLabel)}>{label}</span>
    </Badge>
  );
}

function AppearanceStripStat({
  icon: MetricIcon,
  iconStyle = "default",
  iconWeight = "regular",
  metric,
  numberFormat,
  t,
  unitKey,
  value,
}: {
  readonly icon: Icon;
  readonly iconStyle?: "default" | "yellow";
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
    <span {...applyStyles(styles.stat)}>
      <MetricIcon
        aria-hidden="true"
        data-metric-icon={metric}
        weight={iconWeight}
        {...applyStyles(iconStyle === "yellow" ? styles.yellowIcon : styles.icon)}
      />
      {value === null ? (
        <span data-size="empty" {...applyStyles(typography.caption)}>
          <span data-metric={metric} {...applyStyles(styles.medium)}>
            {t("player.noData")}
          </span>
        </span>
      ) : (
        <>
          <span {...applyStyles(typography.caption, styles.value)}>
            <span data-metric={metric} {...applyStyles(styles.valueStrong)}>
              {numberFormat.format(value)}
            </span>
          </span>
          {unitKey === null ? null : (
            <span {...applyStyles(typography.caption, styles.cqSrOnly)}>
              <span {...applyStyles(styles.medium)}>{t(unitKey, { count: value })}</span>
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
