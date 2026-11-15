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
  /** Last row inside the playoff places; the cut line is drawn below it. */
  readonly lastAboveCut: boolean;
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
    lastAboveCut: cut !== null && index === cut - 1,
  }));
}

/** Playoff places when the table has teams on both sides of the cut. */
export function playoffCut(snapshot: CompetitionStandingSnapshotDto): number | null {
  const spots = snapshot.playoffSpots;
  return spots !== null && snapshot.rows.length > spots ? spots : null;
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
