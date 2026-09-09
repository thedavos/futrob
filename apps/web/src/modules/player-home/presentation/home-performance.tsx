import type { ReactNode } from "react";
import {
  ChartBarIcon,
  CourtBasketballIcon,
  IdentificationCardIcon,
  SoccerBallIcon,
  StarIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Text,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
  type Icon,
  type StatValueProps,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeBanner, HomeCard } from "./home-card.tsx";
import type { PlayerHomePerformanceSlot } from "./player-home-model.ts";

const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  group: {
    display: "grid",
    width: "100%",
    gap: "1rem",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
    columnGap: "1rem",
    rowGap: "1rem",
  },
  panel: {
    minWidth: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: "1rem",
    gap: "0.5rem",
  },
  stack: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    minWidth: 0,
    columnGap: "0.75rem",
  },
  iconCell: {
    gridColumn: "1",
    gridRow: "1 / -1",
    alignSelf: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    color: colors.primary,
  },
  textCol: {
    gridColumn: "2",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
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
      return (
        <section aria-label={t("player.statistics.summary")}>
          <StatGroup className={styles.group}>
            <KpiStat
              icon={<KpiIcon icon={CourtBasketballIcon} />}
              label={t("player.home.stats.matches")}
              value={
                slot.profile ? numberFormat.format(slot.profile.sampleSize) : t("player.noData")
              }
            />
            <KpiStat
              icon={<KpiIcon icon={TrophyIcon} />}
              label={t("player.home.stats.wins")}
              value={summary ? numberFormat.format(summary.wins) : t("player.noData")}
            />
            <KpiStat
              icon={<KpiIcon icon={StarIcon} />}
              label={t("player.home.stats.rating")}
              value={rating == null ? t("player.noData") : numberFormat.format(rating)}
              valueTone={rating == null ? "muted" : "default"}
            />
            <KpiStat
              icon={<KpiIcon icon={SoccerBallIcon} />}
              label={t("player.home.stats.goalsAssists")}
              value={
                summary
                  ? numberFormat.format(summary.totals.goals + summary.totals.assists)
                  : t("player.noData")
              }
            />
          </StatGroup>
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

function KpiStat({
  icon,
  label,
  value,
  valueTone,
}: {
  readonly icon: ReactNode;
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly valueTone?: StatValueProps["tone"];
}) {
  return (
    <Stat className={styles.panel}>
      <div {...applyStyles(styles.stack)}>
        {icon}
        <div {...applyStyles(styles.textCol)}>
          <StatLabel>{label}</StatLabel>
          <StatValue tone={valueTone}>{value}</StatValue>
        </div>
      </div>
    </Stat>
  );
}

function KpiIcon({ icon: Glyph }: { readonly icon: Icon }) {
  return (
    <span aria-hidden {...applyStyles(styles.iconCell)}>
      <Glyph aria-hidden size={KPI_ICON_SIZE} {...applyStyles(styles.icon)} />
    </span>
  );
}
