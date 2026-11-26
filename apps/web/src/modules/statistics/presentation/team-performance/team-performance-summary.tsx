import type { TeamPerformanceRankingSnapshotDto } from "@futrob/api-contracts";
import { CheckCircleIcon, ShieldIcon, TrendUpIcon, TrophyIcon } from "@phosphor-icons/react";
import { StatHint } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ProfileKpiGroup, ProfileKpiStat } from "@/shared/presentation/stats/profile-kpi.tsx";
import { teamPerformanceHighlights, type TeamPerformanceNames } from "./team-performance-model.ts";

/**
 * Team performance summary strip using the canonical profile stat composition
 * (`design.md` §Composición Stat perfil: muted icon without island + value + context hint).
 */
export function TeamPerformanceSummary({
  nameMap,
  names,
  ranking,
  t,
}: {
  readonly nameMap: ReadonlyMap<string, string>;
  readonly names: TeamPerformanceNames;
  readonly ranking: TeamPerformanceRankingSnapshotDto;
  readonly t: Translator;
}) {
  const highlights = teamPerformanceHighlights(ranking);
  const integer = new Intl.NumberFormat(t.locale);
  const decimal = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 });
  const unavailable = t("teamPerformance.summary.unavailable");

  const leaderHint = (() => {
    if (!highlights.leader) return null;
    const teamsText = teamGroupLabel(highlights.leader.teamIds, nameMap, names, t);
    const gap =
      highlights.leader.leadOverSecond === null
        ? null
        : highlights.leader.leadOverSecond === 0
          ? t("teamPerformance.summary.leader.tied")
          : t("teamPerformance.summary.leader.ahead", {
              points: integer.format(highlights.leader.leadOverSecond),
            });
    return joinHints(teamsText, gap, t);
  })();

  const formHint = (() => {
    const form = highlights.bestForm;
    if (!form) return null;
    const teamsText = teamGroupLabel(form.teamIds, nameMap, names, t);
    const ratio =
      form.teamIds.length === 1 && form.evidence.recentMaximum > 0
        ? t("teamPerformance.summary.pointsRatio", {
            points: decimal.format(form.evidence.recentPoints),
            maximum: decimal.format(form.evidence.recentMaximum),
          })
        : null;
    return joinHints(teamsText, ratio, t);
  })();

  const defenseHint = (() => {
    const defense = highlights.bestDefense;
    if (!defense) return null;
    const teamsText = teamGroupLabel(defense.teamIds, nameMap, names, t);
    const ratio =
      defense.teamIds.length === 1 && defense.evidence.shotsAgainst !== null
        ? t("teamPerformance.summary.defenseRatio", {
            conceded: integer.format(defense.evidence.goalsAgainst),
            shots: integer.format(defense.evidence.shotsAgainst),
          })
        : null;
    return joinHints(teamsText, ratio, t);
  })();

  const coverageHint = (
    <StatHint>
      {highlights.incomplete === 0
        ? t("teamPerformance.summary.coverageAll", {
            approved: integer.format(highlights.approvedSources),
          })
        : t("teamPerformance.summary.coveragePartial", {
            incomplete: integer.format(highlights.incomplete),
            approved: integer.format(highlights.approvedSources),
          })}
    </StatHint>
  );

  return (
    <section aria-label={t("teamPerformance.summary.label")}>
      <ProfileKpiGroup>
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={leaderHint}
          icon={TrophyIcon}
          label={t("teamPerformance.summary.leader")}
          value={highlights.leader ? integer.format(highlights.leader.score) : null}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={formHint}
          icon={TrendUpIcon}
          label={t("teamPerformance.summary.bestForm")}
          value={highlights.bestForm ? decimal.format(highlights.bestForm.value) : null}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={defenseHint}
          icon={ShieldIcon}
          label={t("teamPerformance.summary.bestDefense")}
          value={highlights.bestDefense ? decimal.format(highlights.bestDefense.value) : null}
        />
        <ProfileKpiStat
          emptyLabel={unavailable}
          hint={coverageHint}
          icon={CheckCircleIcon}
          label={t("teamPerformance.summary.coverage")}
          value={
            highlights.total > 0
              ? t("teamPerformance.summary.coverageValue", {
                  scored: integer.format(highlights.scored),
                  total: integer.format(highlights.total),
                })
              : null
          }
        />
      </ProfileKpiGroup>
    </section>
  );
}

function teamGroupLabel(
  teamIds: readonly string[],
  nameMap: ReadonlyMap<string, string>,
  names: TeamPerformanceNames,
  t: Translator,
): string | null {
  const [firstId, ...rest] = teamIds;
  if (!firstId) return null;
  const resolved = nameMap.get(firstId);
  const firstLabel =
    resolved ?? (names.kind === "loading" ? null : t("teamPerformance.team.unknown"));
  if (!firstLabel) return null;
  if (rest.length === 0) return firstLabel;
  return t("teamPerformance.summary.tiedTeams", { team: firstLabel, count: rest.length });
}

function joinHints(first: string | null, second: string | null, t: Translator) {
  if (first && second) {
    return <StatHint>{t("teamPerformance.summary.join", { first, second })}</StatHint>;
  }
  if (first) return <StatHint>{first}</StatHint>;
  if (second) return <StatHint>{second}</StatHint>;
  return null;
}
