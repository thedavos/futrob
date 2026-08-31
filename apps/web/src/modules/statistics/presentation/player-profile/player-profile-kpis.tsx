import type { ReactNode } from "react";
import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import { ChartPieIcon, HandshakeIcon, SoccerBallIcon, StarIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Stat,
  StatGroup,
  StatHint,
  StatLabel,
  StatValue,
  type Icon,
  type StatValueProps,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { winPercent } from "./player-profile-model.ts";

/** Decorative marker beside the label / value / hint stack. */
const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  group: {
    display: "grid",
    width: "100%",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
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
    color: colors.mutedForeground,
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
});

export function PlayerProfileKpis({
  numberFormat,
  percentFormat,
  profile,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly profile: PlayerGameProfileDto;
  readonly t: Translator;
}) {
  const winsShare = winPercent(profile.summary);
  const winShareLabel = winsShare === null ? null : percentFormat.format(winsShare / 100);
  const assistsAverage = profile.summary.averages.assists;
  const goalsAverage = profile.summary.averages.goals;

  return (
    <section aria-label={t("player.statistics.summary")}>
      <StatGroup {...applyStyles(styles.group)}>
        <KpiStat
          icon={<KpiIcon icon={ChartPieIcon} />}
          label={t("player.statistics.record")}
          value={`${profile.summary.wins}–${profile.summary.draws}–${profile.summary.losses}`}
          hint={
            winShareLabel === null ? null : (
              <StatHint>{t("player.statistics.record.hint", { percent: winShareLabel })}</StatHint>
            )
          }
        />
        <KpiStat
          icon={<KpiIcon icon={StarIcon} />}
          label={t("player.metric.rating")}
          value={
            profile.summary.averages.rating === null
              ? t("player.noData")
              : numberFormat.format(profile.summary.averages.rating)
          }
          valueTone={profile.summary.averages.rating === null ? "muted" : "default"}
          hint={<StatHint>{t("player.statistics.rating.hint")}</StatHint>}
        />
        <KpiStat
          icon={<KpiIcon icon={SoccerBallIcon} />}
          label={t("player.metric.goals")}
          value={
            goalsAverage === null
              ? t("player.noData")
              : numberFormat.format(profile.summary.totals.goals)
          }
          valueTone={goalsAverage === null ? "muted" : "default"}
          hint={
            goalsAverage === null ? null : (
              <StatHint>
                {t("player.statistics.goals.hint", { average: numberFormat.format(goalsAverage) })}
              </StatHint>
            )
          }
        />
        <KpiStat
          icon={<KpiIcon icon={HandshakeIcon} />}
          label={t("player.metric.assists")}
          value={
            assistsAverage === null
              ? t("player.noData")
              : numberFormat.format(profile.summary.totals.assists)
          }
          valueTone={assistsAverage === null ? "muted" : "default"}
          hint={
            assistsAverage === null ? null : (
              <StatHint>
                {t("player.statistics.assists.hint", {
                  average: numberFormat.format(assistsAverage),
                })}
              </StatHint>
            )
          }
        />
      </StatGroup>
    </section>
  );
}

function KpiStat({
  icon,
  label,
  value,
  hint,
  valueTone,
}: {
  readonly icon: ReactNode;
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly hint: ReactNode;
  readonly valueTone?: StatValueProps["tone"];
}) {
  return (
    <Stat {...applyStyles(styles.panel)}>
      <div {...applyStyles(styles.stack)}>
        {icon}
        <div {...applyStyles(styles.textCol)}>
          <StatLabel>{label}</StatLabel>
          <StatValue tone={valueTone}>{value}</StatValue>
          {hint}
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
