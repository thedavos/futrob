import type {
  CompetitionStandingRowDto,
  CompetitionStandingSnapshotDto,
} from "@futrob/api-contracts";

/** Where the row's team name stands; the id is never shown as a name. */
export type TeamNames =
  | { readonly kind: "loading" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly byId: ReadonlyMap<string, string> };

export type StandingsTeamName =
  | { readonly kind: "name"; readonly value: string }
  | { readonly kind: "loading" }
  | { readonly kind: "unresolved" };

export type StandingsTableRow = {
  readonly row: CompetitionStandingRowDto;
  readonly team: StandingsTeamName;
  /** True when the row sits inside the playoff places (or is the leader without a cut). */
  readonly inHighlightedZone: boolean;
  /** Last row inside the playoff places; the cut line is drawn below it. */
  readonly lastAboveCut: boolean;
};

export type StandingsLeaderSummary = {
  readonly teamId: string;
  readonly points: number;
  /** Gap over second place when at least two rows exist; null for a single-team table. */
  readonly leadOverSecond: number | null;
};

export type StandingsGoalsLeader = {
  readonly value: number;
  /** Per-match average of the first tied leader when `played > 0`; null when unplayed. */
  readonly perMatch: number | null;
  readonly teamIds: readonly string[];
};

export type StandingsSummary = {
  readonly leader: StandingsLeaderSummary | null;
  readonly bestAttack: StandingsGoalsLeader | null;
  readonly bestDefense: StandingsGoalsLeader | null;
  /**
   * Results the table has computed, not official matches: a two-leg aggregate series adds one
   * `played` per team although it groups two approved slots. The snapshot carries no slot count.
   */
  readonly computedResults: number;
  readonly teamCount: number;
};

export function standingsTeamName(teamId: string, names: TeamNames): StandingsTeamName {
  if (names.kind === "loading") return { kind: "loading" };
  const value = names.kind === "ready" ? names.byId.get(teamId) : undefined;
  return value ? { kind: "name", value } : { kind: "unresolved" };
}

/**
 * The server's order is the table's order: positions come from the snapshot, not from a
 * re-sort here, so scoring and tiebreaks stay in `statistics`.
 */
export function standingsTableRows(
  snapshot: CompetitionStandingSnapshotDto,
  names: TeamNames,
): readonly StandingsTableRow[] {
  const cut = playoffCut(snapshot);
  return snapshot.rows.map((row, index) => ({
    row,
    team: standingsTeamName(row.teamId, names),
    inHighlightedZone: cut !== null ? index < cut : row.position === 1,
    lastAboveCut: cut !== null && index === cut - 1,
  }));
}

/** Playoff places when the table has teams on both sides of the cut. */
export function playoffCut(snapshot: CompetitionStandingSnapshotDto): number | null {
  const spots = snapshot.playoffSpots;
  return spots !== null && snapshot.rows.length > spots ? spots : null;
}

/** Derives summary KPIs strictly from the official standing rows without inventing metrics. */
export function standingsSummary(snapshot: CompetitionStandingSnapshotDto): StandingsSummary {
  const { rows } = snapshot;
  const first = rows[0];
  const second = rows[1];
  const leader: StandingsLeaderSummary | null = first
    ? {
        teamId: first.teamId,
        points: first.points,
        leadOverSecond: second ? first.points - second.points : null,
      }
    : null;

  const playedRows = rows.filter((row) => row.played > 0);
  const bestAttack = pickGoalsLeader(playedRows, (row) => row.goalsFor, "max");
  const bestDefense = pickGoalsLeader(playedRows, (row) => row.goalsAgainst, "min");
  const totalTeamResults = rows.reduce((sum, row) => sum + row.played, 0);

  return {
    leader,
    bestAttack,
    bestDefense,
    computedResults: Math.floor(totalTeamResults / 2),
    teamCount: rows.length,
  };
}

function pickGoalsLeader(
  rows: readonly CompetitionStandingRowDto[],
  pick: (row: CompetitionStandingRowDto) => number,
  direction: "max" | "min",
): StandingsGoalsLeader | null {
  if (rows.length === 0) return null;
  let best = pick(rows[0]!);
  for (const row of rows) {
    const value = pick(row);
    if (direction === "max" ? value > best : value < best) best = value;
  }
  const leaders = rows.filter((row) => pick(row) === best);
  const representative = leaders[0]!;
  return {
    value: best,
    perMatch: representative.played > 0 ? best / representative.played : null,
    teamIds: leaders.map((row) => row.teamId),
  };
}

/** Where a Swiss table stands. Null in every other format. */
export type SwissStandingsProgress =
  | { readonly kind: "final" }
  | { readonly kind: "round"; readonly current: number; readonly total: number }
  | { readonly kind: "between"; readonly completed: number; readonly total: number };

export function swissStandingsProgress(
  swiss: CompetitionStandingSnapshotDto["swiss"],
): SwissStandingsProgress | null {
  if (!swiss) return null;
  if (swiss.isFinal) return { kind: "final" };
  return swiss.currentRound === null
    ? { kind: "between", completed: swiss.roundsCompleted, total: swiss.roundsTotal }
    : { kind: "round", current: swiss.currentRound, total: swiss.roundsTotal };
}

export function teamNamesFrom(
  teams: readonly { readonly id: string; readonly name: string }[],
): ReadonlyMap<string, string> {
  return new Map(teams.map((team) => [team.id, team.name]));
}
