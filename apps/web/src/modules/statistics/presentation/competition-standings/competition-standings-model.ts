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
  return snapshot.rows.map((row) => ({ row, team: standingsTeamName(row.teamId, names) }));
}

export function teamNamesFrom(
  teams: readonly { readonly id: string; readonly name: string }[],
): ReadonlyMap<string, string> {
  return new Map(teams.map((team) => [team.id, team.name]));
}
