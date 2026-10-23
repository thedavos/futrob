import type { ReactNode } from "react";
import type { TeamCompetitionStatsDto } from "@futrob/api-contracts";
import { HandshakeIcon, ShieldIcon, SoccerBallIcon, StarIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Stat, StatGroup, StatHint, StatLabel, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import {
  latestTeamStatsUpdate,
  teamStatsLeader,
  type TeamStatsLeader,
  type TeamStatsMetricColumn,
} from "./competition-team-stats-model.ts";
import type { TeamStatsFormats } from "./competition-team-stats-table.tsx";
import type { TeamNamesState } from "./competition-team-stats-state.ts";

/** Same tile as Mis estadísticas (`player-profile-kpis.tsx`): muted icon, value and hint. */
const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  group: {
    display: "grid",
    width: "100%",
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
      <KpiStat
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
      <StatGroup {...applyStyles(styles.group)}>
        <KpiStat
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
      </StatGroup>
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

function KpiStat({
  emptyLabel,
  hint,
  icon: Glyph,
  label,
  value,
}: {
  readonly emptyLabel: string;
  readonly hint: ReactNode;
  readonly icon: Icon;
  readonly label: string;
  readonly value: string | null;
}) {
  return (
    <Stat {...applyStyles(styles.panel)}>
      <div {...applyStyles(styles.stack)}>
        <span aria-hidden {...applyStyles(styles.iconCell)}>
          <Glyph aria-hidden size={KPI_ICON_SIZE} {...applyStyles(styles.icon)} />
        </span>
        <div {...applyStyles(styles.textCol)}>
          <StatLabel>{label}</StatLabel>
          <MetricStatValue emptyLabel={emptyLabel} size="default" value={value} />
          {hint}
        </div>
      </div>
    </Stat>
  );
}
