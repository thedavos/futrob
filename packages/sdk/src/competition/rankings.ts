import type {
  CompetitionTeamManagementDetailResponse,
  GetCompetitionRankingsResponse,
  RankingKindDto,
  RankingRowDto,
  RankingSnapshotDto,
} from "@futrob/api-contracts";

/** Tab order of the player ranking kinds served by `statistics.getCompetitionRankings`. */
export const RANKING_KINDS = [
  "scorer",
  "assister",
  "rating",
  "mvp",
  "goalkeeper",
] as const satisfies readonly RankingKindDto[];

export const DEFAULT_RANKING_KIND: RankingKindDto = "scorer";

/** `null` means the statistics projection has not produced this kind yet. */
export function selectRankingSnapshot(
  response: GetCompetitionRankingsResponse,
  kind: RankingKindDto,
): RankingSnapshotDto | null {
  return response.rankings.find((snapshot) => snapshot.kind === kind) ?? null;
}

/** Teams whose rosters name the snapshot's rows, without repeats. */
export function rankingTeamIds(snapshot: RankingSnapshotDto | null): string[] {
  if (!snapshot) return [];
  return [...new Set(snapshot.rows.flatMap((row) => (row.teamId ? [row.teamId] : [])))];
}

export type RankingNames = {
  /** Player names per Team roster, so a row never borrows a name from another Team's roster. */
  readonly playersByTeam: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly teams: ReadonlyMap<string, string>;
};

/** Display names come from each Team's roster presentation; nothing is guessed from ids. */
export function rankingNamesFromTeams(
  details: readonly CompetitionTeamManagementDetailResponse[],
): RankingNames {
  const playersByTeam = new Map<string, ReadonlyMap<string, string>>();
  const teams = new Map<string, string>();
  for (const detail of details) {
    teams.set(detail.team.id, detail.team.name);
    playersByTeam.set(
      detail.team.id,
      new Map(
        detail.members.map((member) => [
          member.membership.playerProfileId,
          member.presentation.displayName,
        ]),
      ),
    );
  }
  return { playersByTeam, teams };
}

/** A row with a Team is named only by that Team's roster; a row without one by any read roster. */
export function rankingPlayerName(names: RankingNames, row: RankingRowDto): string | undefined {
  if (row.teamId !== null) return names.playersByTeam.get(row.teamId)?.get(row.playerProfileId);
  for (const roster of names.playersByTeam.values()) {
    const name = roster.get(row.playerProfileId);
    if (name !== undefined) return name;
  }
  return undefined;
}
