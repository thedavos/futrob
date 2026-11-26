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

/** Teams across every computed kind, without repeats, so any kind's rows can be named. */
export function competitionRankingTeamIds(response: GetCompetitionRankingsResponse): string[] {
  return [...new Set(response.rankings.flatMap((snapshot) => rankingTeamIds(snapshot)))];
}

export type RankingLeader = {
  readonly row: RankingRowDto;
  /** Value over the next row; `0` when level on value, `null` when nobody else is ranked. */
  readonly lead: number | null;
};

/** First row of a ranking and how far it is ahead; positions come from the API as served. */
export function rankingLeader(snapshot: RankingSnapshotDto): RankingLeader | null {
  const [first, second] = snapshot.rows;
  if (!first) return null;
  return { row: first, lead: second ? first.value - second.value : null };
}

/**
 * Where one player stands in a kind: `ranked` with their row, `unranked` when the kind was
 * computed without them (not eligible or no contribution), `not_computed` when the
 * statistics projection has not produced the kind yet.
 */
export type RankingPlayerStanding =
  | {
      readonly kind: RankingKindDto;
      readonly status: "ranked";
      readonly row: RankingRowDto;
      readonly total: number;
    }
  | { readonly kind: RankingKindDto; readonly status: "unranked"; readonly total: number }
  | { readonly kind: RankingKindDto; readonly status: "not_computed" };

/** One player's place in every ranking kind, in tab order. */
export function rankingPlayerStandings(
  response: GetCompetitionRankingsResponse,
  playerProfileId: string,
): RankingPlayerStanding[] {
  return RANKING_KINDS.map((kind): RankingPlayerStanding => {
    const snapshot = selectRankingSnapshot(response, kind);
    if (!snapshot) return { kind, status: "not_computed" };
    const row = snapshot.rows.find((candidate) => candidate.playerProfileId === playerProfileId);
    const total = snapshot.rows.length;
    return row ? { kind, status: "ranked", row, total } : { kind, status: "unranked", total };
  });
}

/** Rate per 90 minutes for count kinds; an average rating has no per-minute meaning. */
export function rankingPer90(
  kind: RankingKindDto,
  row: Pick<RankingRowDto, "value" | "minutes">,
): number | null {
  if (kind === "rating" || row.minutes <= 0) return null;
  return (row.value * 90) / row.minutes;
}

export type RankingRowFilters = {
  /** Player name search; blank shows every row. */
  readonly query: string;
  /** Only rows of this Team; `null` shows every Team. */
  readonly teamId: string | null;
};

const foldForSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();

/** Rows matching a name search and a Team, keeping their served positions. */
export function filterRankingRows(
  rows: readonly RankingRowDto[],
  names: RankingNames,
  filters: RankingRowFilters,
): RankingRowDto[] {
  const query = foldForSearch(filters.query);
  return rows.filter((row) => {
    if (filters.teamId !== null && row.teamId !== filters.teamId) return false;
    if (query === "") return true;
    const name = rankingPlayerName(names, row);
    return name !== undefined && foldForSearch(name).includes(query);
  });
}

/** Highest per-90 rate among the ranked rows; `null` for rating or when nobody has minutes. */
export function rankingBestPer90(
  snapshot: RankingSnapshotDto,
): { readonly row: RankingRowDto; readonly rate: number } | null {
  let best: { readonly row: RankingRowDto; readonly rate: number } | null = null;
  for (const row of snapshot.rows) {
    const rate = rankingPer90(snapshot.kind, row);
    if (rate !== null && (best === null || rate > best.rate)) best = { row, rate };
  }
  return best;
}
