import { useId } from "react";
import type { TeamCompetitionStatsDto } from "@futrob/api-contracts";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  ChoiceGroup,
  ChoiceGroupItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  isCountCell,
  sortTeamStats,
  TEAM_STATS_METRIC_COLUMNS,
  TEAM_STATS_VIEWS,
  teamStatsCell,
  type TeamStatsMetricColumn,
  type TeamStatsSort,
  type TeamStatsSortColumn,
  type TeamStatsView,
} from "./competition-team-stats-model.ts";
import type { TeamNamesState } from "./competition-team-stats-state.ts";

const styles = stylex.create({
  views: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  numeric: {
    textAlign: "end",
    whiteSpace: "nowrap",
  },
  teamCell: {
    position: "sticky",
    left: 0,
    zIndex: 1,
    backgroundColor: colors.surface,
    minWidth: { default: "9rem", [media.sm]: "12rem" },
    maxWidth: "16rem",
    textAlign: "start",
    fontWeight: 600,
    color: colors.foreground,
  },
  teamHead: {
    position: "sticky",
    left: 0,
    zIndex: 2,
    backgroundColor: colors.muted,
  },
  sortButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    width: "100%",
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    paddingInline: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    font: "inherit",
    whiteSpace: "nowrap",
    cursor: "pointer",
    borderRadius: "var(--corner-sm)",
  },
  sortEnd: {
    justifyContent: "flex-end",
  },
  sortActive: {
    color: colors.foreground,
  },
  sortIcon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
  },
  sortIconIdle: {
    opacity: 0,
  },
  muted: {
    color: colors.mutedForeground,
  },
  partialMark: {
    color: colors.warning,
    marginInlineStart: "0.125rem",
  },
  nameSkeleton: {
    display: "inline-block",
    width: "7rem",
    height: "1rem",
    verticalAlign: "middle",
  },
});

const VIEW_LABEL = {
  totals: "competition.teamStats.view.totals",
  averages: "competition.teamStats.view.averages",
  per90: "competition.teamStats.view.per90",
} as const satisfies Record<TeamStatsView, ParameterlessMessageKey>;

const COLUMN_LABEL = {
  matchesPlayed: "player.metric.matches",
  minutes: "player.metric.minutes",
  goals: "player.metric.goals",
  assists: "player.metric.assists",
  shots: "player.metric.shots",
  passesMade: "player.metric.passesMade",
  passAttempts: "player.metric.passAttempts",
  tacklesMade: "player.metric.tacklesMade",
  tackleAttempts: "player.metric.tackleAttempts",
  saves: "player.metric.saves",
  yellowCards: "player.metric.yellowCards",
  redCards: "player.metric.redCards",
  mvpAwards: "competition.teamStats.column.mvpAwards",
  rating: "competition.teamStats.column.rating",
} as const satisfies Record<TeamStatsMetricColumn, ParameterlessMessageKey>;

export type TeamStatsFormats = {
  readonly count: Intl.NumberFormat;
  readonly rate: Intl.NumberFormat;
};

export function TeamStatsViewSelector({
  onViewChange,
  t,
  view,
}: {
  readonly onViewChange: (view: TeamStatsView) => void;
  readonly t: Translator;
  readonly view: TeamStatsView;
}) {
  const labelId = useId();
  return (
    <div>
      <span id={labelId} {...applyStyles(vis.srOnly)}>
        {t("competition.teamStats.view.label")}
      </span>
      <ChoiceGroup<TeamStatsView>
        aria-labelledby={labelId}
        className={styles.views}
        onValueChange={(next) => onViewChange(next)}
        value={view}
      >
        {TEAM_STATS_VIEWS.map((option) => (
          <ChoiceGroupItem appearance="pill" dense key={option} value={option}>
            {t(VIEW_LABEL[option])}
          </ChoiceGroupItem>
        ))}
      </ChoiceGroup>
    </div>
  );
}

export function CompetitionTeamStatsTable({
  compareText,
  formats,
  labelledBy,
  names,
  onSortChange,
  sort,
  t,
  teams,
  view,
}: {
  readonly compareText: (a: string, b: string) => number;
  readonly formats: TeamStatsFormats;
  readonly labelledBy: string;
  readonly names: TeamNamesState;
  readonly onSortChange: (sort: TeamStatsSort) => void;
  readonly sort: TeamStatsSort;
  readonly t: Translator;
  readonly teams: readonly TeamCompetitionStatsDto[];
  readonly view: TeamStatsView;
}) {
  const nameOf = (teamId: string) =>
    names.kind === "ready"
      ? (names.names[teamId] ?? t("competition.teamStats.teamName.unavailable"))
      : teamId;
  const rows = sortTeamStats(teams, view, sort, nameOf, compareText);

  const toggle = (column: TeamStatsSortColumn) =>
    onSortChange(
      sort.column === column
        ? { column, direction: sort.direction === "desc" ? "asc" : "desc" }
        : { column, direction: column === "team" ? "asc" : "desc" },
    );

  return (
    <Table
      aria-label={t("competition.teamStats.table.label", { view: t(VIEW_LABEL[view]) })}
      containerLabelledBy={labelledBy}
      dense
    >
      <TableHeader>
        <TableRow>
          <SortHeader
            active={sort}
            className={styles.teamHead}
            column="team"
            label={t("competition.teamStats.column.team")}
            onToggle={toggle}
            t={t}
          />
          {TEAM_STATS_METRIC_COLUMNS.map((column) => (
            <SortHeader
              active={sort}
              column={column}
              key={column}
              label={t(COLUMN_LABEL[column])}
              numeric
              onToggle={toggle}
              t={t}
            />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((team) => (
          <TableRow key={team.teamId}>
            <th scope="row" data-slot="table-cell" {...applyStyles(styles.teamCell)}>
              <TeamName names={names} t={t} teamId={team.teamId} />
            </th>
            {TEAM_STATS_METRIC_COLUMNS.map((column) => (
              <TableCell key={column} {...applyStyles(styles.numeric)}>
                <MetricCell column={column} formats={formats} t={t} team={team} view={view} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortHeader({
  active,
  className,
  column,
  label,
  numeric = false,
  onToggle,
  t,
}: {
  readonly active: TeamStatsSort;
  readonly className?: stylex.StyleXStyles;
  readonly column: TeamStatsSortColumn;
  readonly label: string;
  readonly numeric?: boolean;
  readonly onToggle: (column: TeamStatsSortColumn) => void;
  readonly t: Translator;
}) {
  const isActive = active.column === column;
  const ascending = active.direction === "asc";
  const Glyph = isActive && ascending ? CaretUpIcon : CaretDownIcon;
  return (
    <TableHead
      aria-sort={isActive ? (ascending ? "ascending" : "descending") : "none"}
      scope="col"
      {...applyStyles(numeric && styles.numeric, className)}
    >
      <button
        onClick={() => onToggle(column)}
        type="button"
        {...applyStyles(
          styles.sortButton,
          numeric && styles.sortEnd,
          isActive && styles.sortActive,
        )}
      >
        {label}
        {isActive ? (
          <span {...applyStyles(vis.srOnly)}>
            {t(
              ascending
                ? "competition.teamStats.sort.ascending"
                : "competition.teamStats.sort.descending",
            )}
          </span>
        ) : null}
        <Glyph aria-hidden {...applyStyles(styles.sortIcon, !isActive && styles.sortIconIdle)} />
      </button>
    </TableHead>
  );
}

function TeamName({
  names,
  t,
  teamId,
}: {
  readonly names: TeamNamesState;
  readonly t: Translator;
  readonly teamId: string;
}) {
  switch (names.kind) {
    case "loading":
      return (
        <Skeleton
          aria-label={t("competition.teamStats.teamName.loading")}
          {...applyStyles(styles.nameSkeleton)}
        />
      );
    case "ready": {
      const name = names.names[teamId];
      return name === undefined ? (
        <span {...applyStyles(styles.muted)}>
          {t("competition.teamStats.teamName.unavailable")}
        </span>
      ) : (
        name
      );
    }
    case "error":
      return (
        <span {...applyStyles(styles.muted)}>
          {t("competition.teamStats.teamName.unavailable")}
        </span>
      );
    default: {
      const exhaustive: never = names;
      return exhaustive;
    }
  }
}

function MetricCell({
  column,
  formats,
  t,
  team,
  view,
}: {
  readonly column: TeamStatsMetricColumn;
  readonly formats: TeamStatsFormats;
  readonly t: Translator;
  readonly team: TeamCompetitionStatsDto;
  readonly view: TeamStatsView;
}) {
  const cell = teamStatsCell(team, view, column);
  if (cell.value === null) {
    return (
      <>
        <span aria-hidden {...applyStyles(styles.muted)}>
          —
        </span>
        <span {...applyStyles(vis.srOnly)}>{t("competition.teamStats.unavailable")}</span>
      </>
    );
  }
  const format = isCountCell(view, column) ? formats.count : formats.rate;
  return (
    <>
      {format.format(cell.value)}
      {cell.partial ? (
        <>
          <span aria-hidden {...applyStyles(styles.partialMark)}>
            *
          </span>
          <span
            {...applyStyles(vis.srOnly)}
          >{`, ${t("competition.teamStats.partial.marker")}`}</span>
        </>
      ) : null}
    </>
  );
}
