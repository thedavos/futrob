import type {
  CompetitionStandingRowDto,
  CompetitionStandingSnapshotDto,
} from "@futrob/api-contracts";

/** A standings row with its team name, as far as the client could resolve it. */
export type StandingsTableRow = {
  readonly row: CompetitionStandingRowDto;
  /** Null while names are unknown or when the team no longer resolves; never the id. */
  readonly teamName: string | null;
  /** Last row inside the playoff places; the cut line goes below it. */
  readonly lastAboveCut: boolean;
};

/**
 * The server's order is the table's order: positions come from the snapshot, not a re-sort
 * here, so scoring and tiebreaks stay in `statistics`. Same rule as the web standings model.
 */
export function standingsTableRows(
  snapshot: CompetitionStandingSnapshotDto,
  teamNames: ReadonlyMap<string, string> | undefined,
): readonly StandingsTableRow[] {
  const cut = playoffCut(snapshot);
  return snapshot.rows.map((row, index) => ({
    row,
    teamName: teamNames?.get(row.teamId) ?? null,
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
