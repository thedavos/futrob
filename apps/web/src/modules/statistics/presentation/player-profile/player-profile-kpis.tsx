import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import { ChartPieIcon, HandshakeIcon, SoccerBallIcon, StarIcon } from "@phosphor-icons/react";
import { StatHint } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import { winPercent } from "./player-profile-model.ts";

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
      <ProfileKpiGroup>
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          icon={ChartPieIcon}
          label={t("player.statistics.record")}
          value={`${profile.summary.wins}–${profile.summary.draws}–${profile.summary.losses}`}
          hint={
            winShareLabel === null ? null : (
              <StatHint>{t("player.statistics.record.hint", { percent: winShareLabel })}</StatHint>
            )
          }
        />
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          icon={StarIcon}
          label={t("player.metric.rating")}
          value={
            profile.summary.averages.rating === null
              ? null
              : numberFormat.format(profile.summary.averages.rating)
          }
          hint={<StatHint>{t("player.statistics.rating.hint")}</StatHint>}
        />
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          icon={SoccerBallIcon}
          label={t("player.metric.goals")}
          value={goalsAverage === null ? null : numberFormat.format(profile.summary.totals.goals)}
          hint={
            goalsAverage === null ? null : (
              <StatHint>
                {t("player.statistics.goals.hint", { average: numberFormat.format(goalsAverage) })}
              </StatHint>
            )
          }
        />
        <ProfileKpiStat
          emptyLabel={t("player.noData")}
          icon={HandshakeIcon}
          label={t("player.metric.assists")}
          value={
            assistsAverage === null ? null : numberFormat.format(profile.summary.totals.assists)
          }
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
      </ProfileKpiGroup>
    </section>
  );
}
