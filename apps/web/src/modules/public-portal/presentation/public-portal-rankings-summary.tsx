import { CrownSimpleIcon, GaugeIcon, TrendUpIcon, UsersThreeIcon } from "@phosphor-icons/react";
import type { GetPublicRankingResponse } from "@futrob/api-contracts";
import { StatHint } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import { publicRankingSummary, rankingUsesPerMatchRate } from "./public-portal-model.ts";

type Ranking = GetPublicRankingResponse["ranking"];

function playerWithTeam(player: string, team: string | null, t: Translator): string {
  return team ? t("competition.rankings.summary.join", { first: player, second: team }) : player;
}

export function PortalRankingSummaryStrip({ ranking }: { readonly ranking: Ranking }) {
  const { locale, t } = useI18n();
  const summary = publicRankingSummary(ranking);
  const integer = new Intl.NumberFormat(locale);
  const valueFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const rateFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const unavailable = t("competition.rankings.summary.unavailable");
  const usesRate = rankingUsesPerMatchRate(ranking.kind);

  const leadValue = (() => {
    if (!summary.leader || summary.leader.lead === null) return null;
    if (summary.leader.lead === 0) return t("competition.rankings.summary.leadLevel");
    return t("competition.rankings.summary.leadValue", {
      value: valueFormat.format(summary.leader.lead),
    });
  })();

  const runnerUpText = summary.runnerUp
    ? playerWithTeam(summary.runnerUp.playerName, summary.runnerUp.teamName, t)
    : null;
  const leadHint =
    !summary.leader || summary.leader.lead === null || runnerUpText === null
      ? null
      : summary.leader.lead === 0
        ? t("competition.rankings.summary.leadLevelWith", { player: runnerUpText })
        : t("competition.rankings.summary.leadOver", { player: runnerUpText });

  return (
    <section aria-label={t("competition.rankings.summary.label")}>
      <ProfileKpiGroup>
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={
            summary.leader ? (
              <StatHint>
                {playerWithTeam(summary.leader.playerName, summary.leader.teamName, t)}
              </StatHint>
            ) : null
          }
          icon={CrownSimpleIcon}
          label={t("competition.rankings.summary.leader")}
          value={summary.leader ? valueFormat.format(summary.leader.value) : null}
        />
        <ProfileKpiStat
          emptyLabel={summary.leader ? t("competition.rankings.summary.leadAlone") : unavailable}
          hint={leadHint ? <StatHint>{leadHint}</StatHint> : null}
          icon={TrendUpIcon}
          label={t("competition.rankings.summary.lead")}
          value={leadValue}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={
            summary.teamCount > 0 ? (
              <StatHint>
                {t("competition.rankings.summary.teams", {
                  count: integer.format(summary.teamCount),
                })}
              </StatHint>
            ) : null
          }
          icon={UsersThreeIcon}
          label={t("competition.rankings.summary.players")}
          value={integer.format(summary.playerCount)}
        />
        <ProfileKpiStat
          emptyLabel={usesRate ? unavailable : t("competition.rankings.summary.per90NotApplicable")}
          hint={
            !usesRate ? (
              <StatHint>{t("portal.rankings.summary.perMatchRatingHint")}</StatHint>
            ) : summary.bestPerMatch ? (
              <StatHint>
                {playerWithTeam(summary.bestPerMatch.playerName, summary.bestPerMatch.teamName, t)}
              </StatHint>
            ) : null
          }
          icon={GaugeIcon}
          label={t("portal.rankings.summary.perMatch")}
          value={summary.bestPerMatch ? rateFormat.format(summary.bestPerMatch.rate) : null}
        />
      </ProfileKpiGroup>
    </section>
  );
}
