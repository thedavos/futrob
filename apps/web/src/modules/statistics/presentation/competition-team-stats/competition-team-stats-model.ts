import type { TeamCompetitionStatsDto } from "@futrob/api-contracts";

/** Table readings of the same DTO: totals, `averages` (per match) and `per90`. */
export const TEAM_STATS_VIEWS = ["totals", "averages", "per90"] as const;
export type TeamStatsView = (typeof TEAM_STATS_VIEWS)[number];

export const TEAM_STATS_METRIC_COLUMNS = [
  "matchesPlayed",
  "minutes",
  "goals",
  "assists",
  "shots",
  "passesMade",
  "passAttempts",
  "tacklesMade",
  "tackleAttempts",
  "saves",
  "yellowCards",
  "redCards",
  "mvpAwards",
  "rating",
] as const;
export type TeamStatsMetricColumn = (typeof TEAM_STATS_METRIC_COLUMNS)[number];

export const TEAM_STATS_SORT_COLUMNS = ["team", ...TEAM_STATS_METRIC_COLUMNS] as const;
export type TeamStatsSortColumn = (typeof TEAM_STATS_SORT_COLUMNS)[number];
export type TeamStatsSortDirection = "asc" | "desc";
export type TeamStatsSort = {
  readonly column: TeamStatsSortColumn;
  readonly direction: TeamStatsSortDirection;
};

export const DEFAULT_TEAM_STATS_VIEW: TeamStatsView = "totals";
export const DEFAULT_TEAM_STATS_SORT: TeamStatsSort = { column: "goals", direction: "desc" };

/** `null` = the DTO has no observed value; `partial` = some approved matches lacked the metric. */
export type TeamStatsCell = { readonly value: number | null; readonly partial: boolean };

type RateMetric = Exclude<TeamStatsMetricColumn, "matchesPlayed" | "minutes">;

/**
 * Reads one cell from the DTO without new formulas. Totals default to 0 for metrics that
 * were never observed, so a null per-match average marks the total as unavailable too.
 * Rating is always the per-match average: a summed or per-90 rating has no meaning.
 */
export function teamStatsCell(
  team: TeamCompetitionStatsDto,
  view: TeamStatsView,
  column: TeamStatsMetricColumn,
): TeamStatsCell {
  if (column === "matchesPlayed") return { value: team.matchesPlayed, partial: false };
  if (column === "minutes") return { value: team.minutes, partial: team.partial.minutes };
  const value = rateValue(team, view, column);
  return { value, partial: value !== null && team.partial[column] };
}

function rateValue(
  team: TeamCompetitionStatsDto,
  view: TeamStatsView,
  metric: RateMetric,
): number | null {
  const average = team.averages[metric];
  if (metric === "rating") return average;
  switch (view) {
    case "totals":
      return average === null ? null : team.totals[metric];
    case "averages":
      return average;
    case "per90":
      return team.per90[metric];
    default: {
      const exhaustive: never = view;
      return exhaustive;
    }
  }
}

/** Whether a view shows a column as a count (integer) rather than a rate. */
export function isCountCell(view: TeamStatsView, column: TeamStatsMetricColumn): boolean {
  if (column === "matchesPlayed" || column === "minutes") return true;
  if (column === "rating") return false;
  return view === "totals";
}

export function hasPartialTeamStats(teams: readonly TeamCompetitionStatsDto[]): boolean {
  return teams.some((team) => Object.values(team.partial).some(Boolean));
}

export function latestTeamStatsUpdate(teams: readonly TeamCompetitionStatsDto[]): string | null {
  let latest: string | null = null;
  for (const team of teams) {
    if (latest === null || Date.parse(team.updatedAt) > Date.parse(latest)) latest = team.updatedAt;
  }
  return latest;
}

/**
 * Orders rows for display. Unavailable values stay last in both directions; ties fall back
 * to the team name so the order does not jump between refreshes.
 */
export function sortTeamStats(
  teams: readonly TeamCompetitionStatsDto[],
  view: TeamStatsView,
  sort: TeamStatsSort,
  nameOf: (teamId: string) => string,
  compareText: (a: string, b: string) => number,
): readonly TeamCompetitionStatsDto[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const byName = (a: TeamCompetitionStatsDto, b: TeamCompetitionStatsDto) =>
    compareText(nameOf(a.teamId), nameOf(b.teamId)) || compareText(a.teamId, b.teamId);
  return [...teams].sort((a, b) => {
    if (sort.column === "team") return sign * byName(a, b);
    const left = teamStatsCell(a, view, sort.column).value;
    const right = teamStatsCell(b, view, sort.column).value;
    if (left === null || right === null) {
      if (left !== right) return left === null ? 1 : -1;
      return byName(a, b);
    }
    return sign * (left - right) || byName(a, b);
  });
}

export type TeamStatsLeader = {
  readonly value: number;
  readonly teamIds: readonly string[];
  readonly partial: boolean;
};

/** Highest available value of a column; ties keep every team. `null` when no team has data. */
export function teamStatsLeader(
  teams: readonly TeamCompetitionStatsDto[],
  view: TeamStatsView,
  column: TeamStatsMetricColumn,
): TeamStatsLeader | null {
  let leader: { value: number; teamIds: string[]; partial: boolean } | null = null;
  for (const team of teams) {
    const cell = teamStatsCell(team, view, column);
    if (cell.value === null) continue;
    if (leader === null || cell.value > leader.value) {
      leader = { value: cell.value, teamIds: [team.teamId], partial: cell.partial };
    } else if (cell.value === leader.value) {
      leader.teamIds.push(team.teamId);
      leader.partial ||= cell.partial;
    }
  }
  return leader;
}
