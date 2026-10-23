import type { TeamCompetitionStatsDto } from "@futrob/api-contracts";
import { HandshakeIcon, ShieldIcon, SoccerBallIcon, StarIcon } from "@phosphor-icons/react";
import { StatHint, type Icon } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import {
  latestTeamStatsUpdate,
  teamStatsLeader,
  type TeamStatsLeader,
  type TeamStatsMetricColumn,
} from "./competition-team-stats-model.ts";
import type { TeamStatsFormats } from "./competition-team-stats-table.tsx";
import type { TeamNamesState } from "./competition-team-stats-state.ts";

export function CompetitionTeamStatsSummary({
  dateFormat,
  formats,
  names,
  t,
  teams,
}: {
  readonly dateFormat: Intl.DateTimeFormat;
  readonly formats: TeamStatsFormats;
  readonly names: TeamNamesState;
  readonly t: Translator;
  readonly teams: readonly TeamCompetitionStatsDto[];
}) {
  const updatedAt = latestTeamStatsUpdate(teams);
  const leaderTile = (column: TeamStatsMetricColumn, label: string, icon: Icon) => {
    const leader = teamStatsLeader(teams, "totals", column);
    const format = column === "rating" ? formats.rate : formats.count;
    return (
      <ProfileKpiStat
        emptyLabel={t("competition.teamStats.unavailable")}
        hint={
          leader && names.kind !== "loading" ? (
            <StatHint>{leaderHint(leader, names, t)}</StatHint>
          ) : null
        }
        icon={icon}
        label={label}
        value={leader ? format.format(leader.value) : null}
      />
    );
  };

  return (
    <section aria-label={t("competition.teamStats.summary.label")}>
      <ProfileKpiGroup>
        <ProfileKpiStat
          emptyLabel={t("competition.teamStats.unavailable")}
          hint={
            updatedAt ? (
              <StatHint>
                {t("competition.teamStats.summary.updated", {
                  date: dateFormat.format(new Date(updatedAt)),
                })}
              </StatHint>
            ) : null
          }
          icon={ShieldIcon}
          label={t("competition.teamStats.summary.teams")}
          value={formats.count.format(teams.length)}
        />
        {leaderTile("goals", t("competition.teamStats.summary.goals"), SoccerBallIcon)}
        {leaderTile("assists", t("competition.teamStats.summary.assists"), HandshakeIcon)}
        {leaderTile("rating", t("competition.teamStats.summary.rating"), StarIcon)}
      </ProfileKpiGroup>
    </section>
  );
}

function leaderHint(leader: TeamStatsLeader, names: TeamNamesState, t: Translator): string {
  const nameOf = (teamId: string) =>
    names.kind === "ready"
      ? (names.names[teamId] ?? t("competition.teamStats.teamName.unavailable"))
      : t("competition.teamStats.teamName.unavailable");
  const [first, ...rest] = leader.teamIds;
  const teams =
    rest.length === 0
      ? nameOf(first!)
      : t("competition.teamStats.leader.tied", { team: nameOf(first!), count: rest.length });
  return leader.partial ? t("competition.teamStats.leader.partial", { teams }) : teams;
}
