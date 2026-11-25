import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import { CheckCircleIcon, ShieldIcon, SoccerBallIcon, TrophyIcon } from "@phosphor-icons/react";
import { StatHint } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import {
  standingsSummary,
  standingsTeamName,
  type StandingsGoalsLeader,
  type TeamNames,
} from "./competition-standings-model.ts";

/**
 * Official standings summary strip using the canonical profile stat composition
 * (`design.md` §Composición Stat perfil: muted icon without island + value + context hint).
 */
export function CompetitionStandingsSummary({
  names,
  snapshot,
  t,
}: {
  readonly names: TeamNames;
  readonly snapshot: CompetitionStandingSnapshotDto;
  readonly t: Translator;
}) {
  const summary = standingsSummary(snapshot);
  const integer = new Intl.NumberFormat(t.locale);
  const rate = new Intl.NumberFormat(t.locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const updated = new Intl.DateTimeFormat(t.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.updatedAt));
  const unavailable = t("standings.summary.unavailable");

  const leaderHint = (() => {
    if (!summary.leader) return null;
    const teamLabel = resolveTeamLabel(summary.leader.teamId, names, t);
    if (summary.leader.leadOverSecond === null) {
      return teamLabel ? <StatHint>{teamLabel}</StatHint> : null;
    }
    const gap =
      summary.leader.leadOverSecond === 0
        ? t("standings.summary.leader.tied")
        : t("standings.summary.leader.ahead", {
            points: integer.format(summary.leader.leadOverSecond),
          });
    return (
      <StatHint>
        {teamLabel ? t("standings.summary.join", { first: teamLabel, second: gap }) : gap}
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
          hint={goalsLeaderHint(summary.bestAttack, names, rate, t)}
          icon={SoccerBallIcon}
          label={t("standings.summary.bestAttack")}
          value={summary.bestAttack ? integer.format(summary.bestAttack.value) : null}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={goalsLeaderHint(summary.bestDefense, names, rate, t)}
          icon={ShieldIcon}
          label={t("standings.summary.bestDefense")}
          value={summary.bestDefense ? integer.format(summary.bestDefense.value) : null}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={
            <StatHint>
              {t("standings.summary.matches.hint", {
                teams: integer.format(summary.teamCount),
                time: updated,
              })}
            </StatHint>
          }
          icon={CheckCircleIcon}
          label={t("standings.summary.matches")}
          value={integer.format(summary.officialMatches)}
        />
      </ProfileKpiGroup>
    </section>
  );
}

function resolveTeamLabel(teamId: string, names: TeamNames, t: Translator): string | null {
  const resolved = standingsTeamName(teamId, names);
  switch (resolved.kind) {
    case "name":
      return resolved.value;
    case "loading":
      return null;
    case "unresolved":
      return t("standings.team.unresolved");
    default: {
      const exhaustive: never = resolved;
      return exhaustive;
    }
  }
}

function goalsLeaderHint(
  leader: StandingsGoalsLeader | null,
  names: TeamNames,
  rate: Intl.NumberFormat,
  t: Translator,
) {
  if (!leader) return null;
  const [firstId, ...rest] = leader.teamIds;
  const firstLabel = firstId ? resolveTeamLabel(firstId, names, t) : null;
  const teamsText = !firstLabel
    ? null
    : rest.length === 0
      ? firstLabel
      : t("standings.summary.tiedTeams", { team: firstLabel, count: rest.length });
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
