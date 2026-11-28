import { CheckCircleIcon, ShieldIcon, SoccerBallIcon, TrophyIcon } from "@phosphor-icons/react";
import type { GetPublicStandingsResponse } from "@futrob/api-contracts";
import { StatHint } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import { publicStandingsSummary, type PublicStandingsGoalsLeader } from "./public-portal-model.ts";

type Standings = GetPublicStandingsResponse["standings"];

function goalsLeaderHint(
  leader: PublicStandingsGoalsLeader | null,
  rate: Intl.NumberFormat,
  t: Translator,
) {
  if (!leader) return null;
  const [first, ...rest] = leader.teamNames;
  const teamsText = !first
    ? null
    : rest.length === 0
      ? first
      : t("standings.summary.tiedTeams", { team: first, count: rest.length });
  const perMatchText =
    rest.length === 0 && leader.perMatch !== null
      ? t("standings.summary.perMatch", { rate: rate.format(leader.perMatch) })
      : null;

  if (teamsText && perMatchText) {
    return (
      <StatHint>{t("standings.summary.join", { first: teamsText, second: perMatchText })}</StatHint>
    );
  }
  if (teamsText) return <StatHint>{teamsText}</StatHint>;
  if (perMatchText) return <StatHint>{perMatchText}</StatHint>;
  return null;
}

export function PortalStandingsSummaryStrip({ standings }: { readonly standings: Standings }) {
  const { locale, t } = useI18n();
  const summary = publicStandingsSummary(standings);
  const integer = new Intl.NumberFormat(locale);
  const rate = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const unavailable = t("standings.summary.unavailable");
  const updated = standings.updatedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(standings.updatedAt),
      )
    : null;

  const leaderHint = (() => {
    if (!summary.leader) return null;
    if (summary.leader.leadOverSecond === null) {
      return <StatHint>{summary.leader.teamName}</StatHint>;
    }
    const gap =
      summary.leader.leadOverSecond === 0
        ? t("standings.summary.leader.tied")
        : t("standings.summary.leader.ahead", {
            points: integer.format(summary.leader.leadOverSecond),
          });
    return (
      <StatHint>
        {t("standings.summary.join", { first: summary.leader.teamName, second: gap })}
      </StatHint>
    );
  })();

  return (
    <section aria-label={t("standings.summary.label")}>
      <ProfileKpiGroup>
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={leaderHint}
          icon={TrophyIcon}
          label={t("standings.summary.leader")}
          value={
            summary.leader
              ? t("standings.summary.points", { points: integer.format(summary.leader.points) })
              : null
          }
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={goalsLeaderHint(summary.bestAttack, rate, t)}
          icon={SoccerBallIcon}
          label={t("standings.summary.bestAttack")}
          value={summary.bestAttack ? integer.format(summary.bestAttack.value) : null}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={goalsLeaderHint(summary.bestDefense, rate, t)}
          icon={ShieldIcon}
          label={t("standings.summary.bestDefense")}
          value={summary.bestDefense ? integer.format(summary.bestDefense.value) : null}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={
            updated ? (
              <StatHint>
                {t("standings.summary.results.hint", {
                  teams: integer.format(summary.teamCount),
                  time: updated,
                })}
              </StatHint>
            ) : (
              <StatHint>{t("portal.header.teams", { count: summary.teamCount })}</StatHint>
            )
          }
          icon={CheckCircleIcon}
          label={t("standings.summary.results")}
          value={integer.format(summary.officialMatches)}
        />
      </ProfileKpiGroup>
    </section>
  );
}
