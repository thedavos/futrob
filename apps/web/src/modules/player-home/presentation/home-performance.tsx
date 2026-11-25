import {
  ChartBarIcon,
  CourtBasketballIcon,
  IdentificationCardIcon,
  SoccerBallIcon,
  StarIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Text } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeKpiGroup, HomeKpiStat } from "@/shared/presentation/stats/home-kpi.tsx";
import { HomeBanner, HomeCard } from "./home-card.tsx";
import type { PlayerHomePerformanceSlot } from "./player-home-model.ts";

const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  emptyRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    columnGap: "0.75rem",
  },
  iconCellMuted: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 20%, transparent)",
    color: colors.mutedForeground,
  },
});

export function HomePerformance({ slot }: { readonly slot: PlayerHomePerformanceSlot }) {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  switch (slot.kind) {
    case "stats": {
      const summary = slot.profile?.summary;
      const rating = summary?.averages.rating;
      const emptyLabel = t("player.noData");
      return (
        <section aria-label={t("player.statistics.summary")}>
          <HomeKpiGroup>
            <HomeKpiStat
              emptyLabel={emptyLabel}
              icon={CourtBasketballIcon}
              label={t("player.home.stats.matches")}
              value={slot.profile ? numberFormat.format(slot.profile.sampleSize) : null}
            />
            <HomeKpiStat
              emptyLabel={emptyLabel}
              icon={TrophyIcon}
              label={t("player.home.stats.wins")}
              value={summary ? numberFormat.format(summary.wins) : null}
            />
            <HomeKpiStat
              emptyLabel={emptyLabel}
              icon={StarIcon}
              label={t("player.home.stats.rating")}
              value={rating == null ? null : numberFormat.format(rating)}
            />
            <HomeKpiStat
              emptyLabel={emptyLabel}
              icon={SoccerBallIcon}
              label={t("player.home.stats.goalsAssists")}
              value={
                summary ? numberFormat.format(summary.totals.goals + summary.totals.assists) : null
              }
            />
          </HomeKpiGroup>
        </section>
      );
    }
    case "empty-matches":
      return (
        <HomeCard>
          <div {...applyStyles(styles.emptyRow)}>
            <span aria-hidden {...applyStyles(styles.iconCellMuted)}>
              <ChartBarIcon aria-hidden size={KPI_ICON_SIZE} {...applyStyles(styles.icon)} />
            </span>
            <Text look="body" weight="medium">
              {t("player.home.stats.empty")}
            </Text>
          </div>
        </HomeCard>
      );
    case "locked":
    case "onboarding":
      return (
        <HomeCard>
          <HomeBanner
            icon={
              <span aria-hidden {...applyStyles(styles.iconCellMuted)}>
                <IdentificationCardIcon
                  aria-hidden
                  size={KPI_ICON_SIZE}
                  {...applyStyles(styles.icon)}
                />
              </span>
            }
            subtitle={t("player.home.stats.unavailableSubtitle")}
            title={t("player.home.stats.unavailableTitle")}
          />
        </HomeCard>
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}
