import type { RankingRowDto, RankingSnapshotDto } from "@futrob/api-contracts";
import { rankingBestPer90, rankingHasPer90, rankingLeader } from "@futrob/sdk";
import { CrownSimpleIcon, GaugeIcon, TrendUpIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { StatHint } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import {
  formatRankingValue,
  rankingNamesOf,
  rankingPlayerName,
  rankingTeamIds,
  type RankingFormatters,
  type RankingNamesState,
} from "./competition-rankings-view.ts";

/**
 * Leader, margin, field and best per-90 rate of the selected kind, in the profile stat
 * composition (`design.md` §Composición Stat perfil: muted icon + value + context hint).
 */
export function RankingSummary({
  formatters,
  names,
  snapshot,
  t,
}: {
  readonly formatters: RankingFormatters;
  readonly names: RankingNamesState;
  readonly snapshot: RankingSnapshotDto;
  readonly t: Translator;
}) {
  const kind = snapshot.kind;
  const leader = rankingLeader(snapshot);
  const runnerUp = snapshot.rows[1];
  const best = rankingBestPer90(snapshot);
  const teams = rankingTeamIds(snapshot).length;
  const unavailable = t("competition.rankings.summary.unavailable");
  const playerLabel = (row: RankingRowDto) => playerWithTeam(names, row, t);
  const hint = (text: string | null) => (text === null ? null : <StatHint>{text}</StatHint>);

  const leadValue = (() => {
    if (!leader || leader.lead === null) return null;
    if (leader.lead === 0) return t("competition.rankings.summary.leadLevel");
    return t("competition.rankings.summary.leadValue", {
      value: formatRankingValue(kind, leader.lead, formatters),
    });
  })();
  const runnerUpName = runnerUp ? playerLabel(runnerUp) : null;
  const leadHint =
    !leader || leader.lead === null || runnerUpName === null
      ? null
      : leader.lead === 0
        ? t("competition.rankings.summary.leadLevelWith", { player: runnerUpName })
        : t("competition.rankings.summary.leadOver", { player: runnerUpName });

  return (
    <section aria-label={t("competition.rankings.summary.label")}>
      <ProfileKpiGroup>
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={hint(leader ? playerLabel(leader.row) : null)}
          icon={CrownSimpleIcon}
          label={t("competition.rankings.summary.leader")}
          value={leader ? formatRankingValue(kind, leader.row.value, formatters) : null}
        />
        <ProfileKpiStat
          emptyLabel={leader ? t("competition.rankings.summary.leadAlone") : unavailable}
          hint={hint(leadHint)}
          icon={TrendUpIcon}
          label={t("competition.rankings.summary.lead")}
          value={leadValue}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={hint(
            teams === 0
              ? null
              : t("competition.rankings.summary.teams", {
                  count: formatters.integer.format(teams),
                }),
          )}
          icon={UsersThreeIcon}
          label={t("competition.rankings.summary.players")}
          value={formatters.integer.format(snapshot.rows.length)}
        />
        <ProfileKpiStat
          emptyLabel={
            rankingHasPer90(kind)
              ? unavailable
              : t("competition.rankings.summary.per90NotApplicable")
          }
          hint={hint(
            kind === "rating"
              ? t("competition.rankings.summary.per90RatingHint")
              : kind === "goalkeeper"
                ? t("competition.rankings.summary.per90GoalkeeperHint")
                : best
                  ? playerLabel(best.row)
                  : null,
          )}
          icon={GaugeIcon}
          label={t("competition.rankings.summary.per90")}
          value={best ? formatters.rate.format(best.rate) : null}
        />
      </ProfileKpiGroup>
    </section>
  );
}

/** Player and Team, so a hint never reads like a second copy of the row's name. */
function playerWithTeam(
  names: RankingNamesState,
  row: RankingRowDto,
  t: Translator,
): string | null {
  // While rosters load the hint waits instead of flashing the unnamed copy.
  if (names.status === "loading") return null;
  const resolved = rankingNamesOf(names);
  const player = rankingPlayerName(resolved, row) ?? t("competition.rankings.player.unnamed");
  const team =
    row.teamId === null
      ? t("competition.rankings.team.none")
      : (resolved.teams.get(row.teamId) ?? t("competition.rankings.team.unnamed"));
  return t("competition.rankings.summary.join", { first: player, second: team });
}
